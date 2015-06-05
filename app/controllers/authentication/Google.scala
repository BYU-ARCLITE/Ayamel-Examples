package controllers.authentication

import play.api.mvc.{Action, Controller}
import java.security.SecureRandom
import play.api.libs.ws.{WS, Response}
import play.api.libs.json.{Json, JsObject}
import concurrent.ExecutionContext
import ExecutionContext.Implicits.global

/**
 * Controller which handles Google authentication.
 */
object Google extends Controller {

  /**
   * Redirects to the Google login page. Uses OpenID
   */
  def login(action: String, path: String = "") = Action {
    implicit request =>
      val random = new SecureRandom()
      val byte_array = Array.fill[Byte](30)(0)

      random.nextBytes(byte_array)
      val state_token = byte_array.mkString

      //Figure out how to save the action & the state token in the session or something

      Redirect("https://accounts.google.com/o/oauth2/auth", Map(
          "client_id" -> Seq("1052219675733-16ul2rbrpm05reqe8cra14ib4m0j8bt8.apps.googleusercontent.com"),
          "response_type" -> Seq("code"),
          "scope" -> Seq("openid email"),
          "redirect_uri" -> Seq("https://ayamel.byu.edu/auth/google/callback/"),
          "state" -> Seq(state_token)
        ), 303
      )
  }

  def decodeIdToken(jwt: String) = {
    Json.obj(
        "test" -> "test"
    )
  }
  
  /**
   * When the Google login is successful, it is redirected here, where user info is extracted and the user is logged in.
   */
  def callback(action: String, path: String = "") = Action {
    implicit request =>
      // Eliminate unchecked ".get"s
      // Confirm anti-forgery state token
      val state: Seq[String] = request.queryString.get("state").get

      val code: Seq[String] = request.queryString.get("code").get
      Async {
        WS.url("Place Holder for the token endpoint ").post(
          Map(
            "code" -> code,
            "client_id" -> Seq("1052219675733-16ul2rbrpm05reqe8cra14ib4m0j8bt8.apps.googleusercontent.com"),
            "client_secret" -> Seq("YcoCdjWna_-EFvoTxwx_q2uK"),
            "redirect_uri" -> Seq("https://ayamel.byu.edu/auth/google/callback/"),
            "grant_type" -> Seq("authorization_code")
          )
        ).map {
          response: Response =>
            try {
              val json = response.json
              val id_token = (json \ "id_token").as[String]
              val id_json = decodeIdToken(id_token)
              
              // check that the email was actually verified - there's a boolean property of the returned JSON object for that
              val email = (id_json \ "email").as[String]
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

}
