package controllers.authentication

import java.security.SecureRandom
import org.apache.commons.codec.binary.Base64
import scala.concurrent.duration.Duration
import scala.concurrent.Await
import scala.concurrent.Future
import play.api.mvc.{Action, Controller}
import play.api.mvc.Results.InternalServerError
import play.api.libs.ws.{WS, Response}
import play.api.libs.json.{Json, JsValue}
import play.api.Logger
import concurrent.ExecutionContext
import ExecutionContext.Implicits.global
import play.api.Play
import play.api.Play.current
import play.api.cache.Cache

/**
 * Controller which handles Google authentication.
 */
object Google extends Controller {

  val logger = Logger("application")
  val isHTTPS = current.configuration.getBoolean("HTTPS").getOrElse(false)
  val client_id = current.configuration.getString("openID.client_id").get
  val client_secret = current.configuration.getString("openID.client_secret").get

  def getDiscoveryDoc() =
    Cache.getOrElse[JsValue]("googleopenid.discoverydoc", 10 * 60) {
      val req = WS.url("https://accounts.google.com/.well-known/openid-configuration").get()
      Await.result(req, Duration.Inf).json
    }

  /**
   * Redirects to the Google login page. Uses OpenID
   */
  def login(action: String, path: String = "") = Action {
    implicit request =>
      val random = new SecureRandom()
      val byte_array = Array.fill[Byte](30)(0)

      random.nextBytes(byte_array)
      val state_token = byte_array.mkString

      val redirect_uri = routes.Google.callback().absoluteURL(isHTTPS)

      //Figure out how to save the action & the state token in the session or something

      try {
        val auth_endpoint = getDiscoveryDoc \ "authorization_endpoint"
        Redirect(auth_endpoint.as[String],
          Map(
            "client_id" -> Seq("1052219675733-16ul2rbrpm05reqe8cra14ib4m0j8bt8.apps.googleusercontent.com"),
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
  def callback() = Action {
    implicit request =>

      val action = "login"
      val path = ""

      val redirect_uri = routes.Google.callback().absoluteURL(isHTTPS)

      try {
        val code = request.queryString.get("code").get
        val state = request.queryString.get("state").get
      
        Async {
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
              Authentication.login(user, path)
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
        }
      } catch {
        case _ : Exception =>
          Redirect(controllers.routes.Application.index())
            .flashing("error" -> "Oops! Something went wrong! Try Again?")
      }
  }
}
