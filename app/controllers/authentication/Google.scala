package controllers.authentication

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
      val state_token = byte_array.mkString

      val redirect_route = routes.Google.callback()
      val redirect_uri = redirect_route.absoluteURL()

      //Figure out how to save the action & the state token in the session or something

      Async {
        WS.url("https://accounts.google.com/.well-known/openid-configuration")
          .get().map { discovery: Response =>
          try {
            val auth_endpoint = (discovery.json \ "authorization_endpoint")
            Redirect(auth_endpoint, Map(
                "client_id" -> Seq("1052219675733-16ul2rbrpm05reqe8cra14ib4m0j8bt8.apps.googleusercontent.com"),
                "response_type" -> Seq("code"),
                "scope" -> Seq("openid email"),
                "redirect_uri" -> Seq(redirect_uri),
                "state" -> Seq(state_token)
              ), 303
            )
          } catch(_)
            InternalServerError
        }
      }
  }

  def decodeIdTokenJson(jwt: String) = {
    val idTokenJsonString = getIdTokenJsonString(jwt)
    val result = Json.parse(idTokenJsonString)
    result
  }

  // Change this to get id token string internally using discovery document
  def getIdTokenJsonString(jwt: String): String = {
    val jsonAddress : String = "https://www.googleapis.com/oauth2/v1/tokeninfo"
    val jsonAwaitable = WS.url(jsonAddress).post(
        Map (
          "id_token" -> Seq(jwt)
        )
      ).map {
      response: Response =>
        response.body
    }
    Await.result(jsonAwaitable, Duration(1000, "millis"))
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
      val state: String = stateSeq(0)

      val codeSeq: Seq[String] = request.queryString.get("code").get
      val code: String = codeSeq(0)

      val redirect_route = routes.Google.callback()
      val redirect_uri = redirect_route.absoluteURL()

      val client_id = Play.current.configuration.getString("openID.client_id")
      val client_secret = Play.current.configuration.getString("openID.client_secret")

      Async {
        WS.url(getTokenEndPoint).post(
          Map(
            "code" -> codeSeq,
            "client_id" -> Seq(client_id),
            "client_secret" -> Seq(client_secret),
            "redirect_uri" -> Seq(redirect_uri),
            "grant_type" -> Seq("authorization_code")
          )
        ).map {
          response: Response =>
            try {

              val json = response.json
              val id_token_property = (json \ "id_token")
              val id_token = id_token_property.as[String]
              val id_json = decodeIdTokenJson(id_token)
              
              // check that the email was actually verified - there's a boolean property of the returned JSON object for that
              val email_verified_property = id_json \ "email_verified"
              val email_verified = email_verified_property.toString
              
              val email_property = (id_json \ "email")
              val email_class = email_property.getClass
              val email_class_name = email_class.getName
              val email = email_property.toString

              logger.debug(email)

              val user = Authentication.getAuthenticatedUser(email, 'google, None, Some(email))

              //Need to figure out how to get the action from the login method
              //if (action == "merge")
              //  Authentication.merge(user)
              //else
                Authentication.login(user, path)
            } catch {
              case _: Exception =>
                Redirect("https://ayamel.byu.edu/")
            }
        }
      }
  }

  // Placeholder. Should get it from the discovery document
  def getTokenEndPoint() = "https://www.googleapis.com/oauth2/v3/token"

}
