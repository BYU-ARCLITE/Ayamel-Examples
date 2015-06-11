package controllers.authentication

import org.apache.commons.codec.binary.Base64
import play.api.mvc.{Action, Controller}
import play.api.mvc.Results.InternalServerError
import java.security.SecureRandom
import play.api.libs.ws.{WS, Response}
import play.api.libs.json.{Json, JsObject}
import play.api.Logger
import concurrent.ExecutionContext
import scala.concurrent.duration.Duration
import scala.concurrent.Await
import ExecutionContext.Implicits.global
import play.api.Play

/**
 * Controller which handles Google authentication.
 */
object Google extends Controller {

  val logger = Logger("application")

  /**
   * Redirects to the Google login page. Uses OpenID
   */
  def login(action: String, path: String = "") = Action {
    implicit request =>
      val random = new SecureRandom()
      val byte_array = Array.fill[Byte](30)(0)

      random.nextBytes(byte_array)
      val state_token = byte_array.mkString()

      val redirect_uri = routes.Google.callback().absoluteURL()

      //Figure out how to save the action & the state token in the session or something

      try {
        Async {
          WS.url("https://accounts.google.com/.well-known/openid-configuration")
          .get().map { discovery: Response =>
            val auth_endpoint = (discovery.json \ "authorization_endpoint")
            Redirect(auth_endpoint.as[String], Map(
                "client_id" -> Seq("1052219675733-16ul2rbrpm05reqe8cra14ib4m0j8bt8.apps.googleusercontent.com"),
                "response_type" -> Seq("code"),
                "scope" -> Seq("openid email"),
                "redirect_uri" -> Seq(redirect_uri),
                "state" -> Seq(state_token)
              ), 303
            )
          }
        }
      } catch {
        case _: Exception =>
          InternalServerError
      }
  }

  def decodeIdTokenJson(jwt: String) = {
    val b64payload = jwt.split('.')(1)
    logger.debug("Payload: " + b64payload)
    val jsBytes = Base64.decodeBase64(b64payload)
    logger.debug("got bytes")
    logger.debug("bytes: " + jsBytes.toString)
    val jsString = new String(jsBytes, "UTF-8")
    logger.debug("jsString: " + jsString)
    Json.parse(jsString)
  }
  
  /**
   * When the Google login is successful, it is redirected here, where user info is extracted and the user is logged in.
   */
  def callback() = Action {
    implicit request =>

      val action = "login"
      val path = ""

      // Eliminate unchecked ".get"s
      // Confirm anti-forgery state token
      val stateSeq: Seq[String] = request.queryString.get("state").get
      val codeSeq: Seq[String] = request.queryString.get("code").get
      val redirect_uri = routes.Google.callback().absoluteURL()

      val client_id : String = Play.current.configuration.getString("openID.client_id").get
      val client_secret : String = Play.current.configuration.getString("openID.client_secret").get
      
      Async {
        WS.url("https://accounts.google.com/.well-known/openid-configuration").get()
        .flatMap { discovery: Response =>
          WS.url((discovery.json \ "token_endpoint").as[String]).post(
            Map(
              "code" -> codeSeq,
              "client_id" -> Seq(client_id),
              "client_secret" -> Seq(client_secret),
              "redirect_uri" -> Seq(redirect_uri),
              "grant_type" -> Seq("authorization_code")
            )
          )
        }.map { response: Response =>
          val id_token = (response.json \ "id_token").as[String]
          val id_json = decodeIdTokenJson(id_token)
          // check that the email was actually verified - there's a boolean property of the returned JSON object for that
          val email_verified = (id_json \ "email_verified").as[Boolean]

          if(email_verified) {
            logger.debug("Ces Troupe!")
            val email = (id_json \ "email").as[String]

            val user = Authentication.getAuthenticatedUser(email, 'google, None, Some(email))

            Authentication.login(user, path)

          }
          else {
            Redirect(routes.Google.callback().absoluteURL())
          }
        }
      }
  }
}
