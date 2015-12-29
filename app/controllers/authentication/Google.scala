package controllers.authentication

import java.security.SecureRandom
import org.apache.commons.codec.binary.Base64
import scala.concurrent.duration.Duration
import scala.concurrent._
import ExecutionContext.Implicits.global
import anorm._
import anorm.SqlParser._

import play.api.mvc.{Action, Controller}
import play.api.mvc.Results.InternalServerError
import play.api.db.DB
import play.api.libs.ws.WS
import play.api.libs.json.{Json, JsValue}
import play.api.Logger
import play.api.Play
import play.api.Play.current
import play.api.cache.Cache

/**
 * Controller which handles Google authentication.
 */
object Google extends Controller {

  val random = new SecureRandom()
  val logger = Logger("application")
  val isHTTPS = current.configuration.getBoolean("HTTPS").getOrElse(false)
  val client_id = current.configuration.getString("openID.client_id").get
  val client_secret = current.configuration.getString("openID.client_secret").get
  val tableName = "login_tokens"

  val simple = {
    get[String](tableName + ".action") ~
    get[String](tableName + ".redirect") map {
      case action ~ path => (action, path)
    }
  }

  def getDiscoveryDoc() =
    Cache.getOrElse[JsValue]("googleopenid.discoverydoc", 60 * 60) {
      val req = WS.url("https://accounts.google.com/.well-known/openid-configuration").get()
      Await.result(req, Duration.Inf).json
    }

  def retrieveStoredState(token: String) = {
    val stateOpt = DB.withConnection { implicit connection =>
      anorm.SQL("select action, redirect from "+tableName+" where token = {token}")
        .on('token -> token).as(simple.singleOpt)
    }

    if(stateOpt.isDefined){ //delete retrieved state so it can't be re-used
      DB.withConnection { implicit connection =>
        anorm.SQL("delete from " + tableName + " where token = {token}")
          .on('token -> token).execute()
      }
    }

    stateOpt
  }

  def registerStateToken(action: String, path: String) = {
    val byte_array = Array.fill[Byte](30)(0)

    random.nextBytes(byte_array)
    val token = byte_array.mkString

    //store token in the database
    DB.withConnection {
      implicit connection =>
        anorm.SQL("insert into "+tableName+" (token, action, redirect) values ({token}, {action}, {path})")
          .on('token -> token, 'action -> action, 'path -> path).executeInsert()
    }

    Future {
      blocking(Thread.sleep(100000))
      if(retrieveStoredState(token).isDefined){
        logger.info("Cleaned up timed-out login token")
      }
    }

    token
  }

  /**
   * Redirects to the Google login page. Uses OpenID
   */
  def login(action: String, path: String = "") = Action {
    implicit request =>

      val redirect_uri = routes.Google.callback().absoluteURL(isHTTPS)
      val state_token = registerStateToken(action, path)

      try {
        val auth_endpoint = getDiscoveryDoc \ "authorization_endpoint"
        Redirect(auth_endpoint.as[String],
          Map(
            "client_id" -> Seq(client_id),
            "response_type" -> Seq("code"),
            "scope" -> Seq("openid email"),
            "redirect_uri" -> Seq(redirect_uri),
            "state" -> Seq(state_token)
          ), 303
        )
      } catch {
        case _: Exception =>
          InternalServerError
      }
  }

  def decodeIdTokenJson(jwt: String) = {
    val b64payload = jwt.split('.')(1)
    val jsBytes = Base64.decodeBase64(b64payload)
    val jsString = new String(jsBytes, "UTF-8")
    Json.parse(jsString)
  }

  /**
   * When the Google login is successful, it is redirected here, where user info is extracted and the user is logged in.
   */
  def callback() = Action.async {
    implicit request =>

      val redirect_uri = routes.Google.callback().absoluteURL(isHTTPS)

      val state = request.queryString.get("state")
        .flatMap(_.lift(0))
        .flatMap(retrieveStoredState)

      state match {
        case None =>
          Future {
            Redirect(controllers.routes.Application.index())
              .flashing("error" -> "Invalid Authentication. Perhaps you waited too long?")
          }
        case Some((action, path)) => try {
          val code = request.queryString.get("code").get
      
          WS.url((getDiscoveryDoc \ "token_endpoint").as[String]).post(
            Map(
              "code" -> code,
              "client_id" -> Seq(client_id),
              "client_secret" -> Seq(client_secret),
              "redirect_uri" -> Seq(redirect_uri),
              "grant_type" -> Seq("authorization_code")
            )
          ).map { response =>

            val id_token = (response.json \ "id_token").as[String]
            val id_json = decodeIdTokenJson(id_token)

            if((id_json \ "email_verified").as[Boolean]) {
              val email = (id_json \ "email").as[String]
              val user = Authentication.getAuthenticatedUser(email, 'google, None, Some(email))
              if(action == "merge") {
                Authentication.merge(user)
              } else {
                Authentication.login(user, path)
              }
            } else {
              Redirect(controllers.routes.Application.index())
                .flashing("error" ->
                  """
                  Sorry! We couldn't log you in because your email address has
                  not been verified. Please go to your Google account and get
                  your email verified before logging in with your Google account.
                  """
                )
            }
          }
        } catch {
          case _ : Exception =>
            Future {
              Redirect(controllers.routes.Application.index())
                .flashing("error" -> "Oops! Something went wrong! Try Again?")
            }
        }
      }
  }
}
