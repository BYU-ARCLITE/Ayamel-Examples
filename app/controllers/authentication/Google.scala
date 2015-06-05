package controllers.authentication

import play.api.mvc.{Action, Controller}
import java.security.SecureRandom
import play.api.libs.ws.{WS, Response}
import play.api.libs.json.{JsObject, JsValue, JsUndefined}
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

      // what is random?

      random.nextBytes(byte_array)//.mkString
      val state_token = byte_array.mkString

      //Figure out how to save the action & the state token in the session or something

      Redirect("https://accounts.google.com/o/oauth2/auth", Map[String, String](
          "client_id" -> "1052219675733-16ul2rbrpm05reqe8cra14ib4m0j8bt8.apps.googleusercontent.com",
          "response_type" -> "code",
          "scope" -> "openid email",
          "redirect_uri" -> "https://ayamel.byu.edu/auth/google/callback/",
          "state" -> state_token
        )
      )
  }


  /**
   * When the Google login is successful, it is redirected here, where user info is extracted and the user is logged in.
   */
  def callback(action: String, path: String = "") = Action {
    implicit request =>
      // Eliminate unchecked ".get"s
      // Confirm anti-forgery state token
      val state = request.queryString.get("state").get

      val code = request.queryString.get("code").get
      Async {
        WS.url("Place Holder for the token endpoint ").post(
		  Map(
            "code" -> code,
            "client_id" -> "1052219675733-16ul2rbrpm05reqe8cra14ib4m0j8bt8.apps.googleusercontent.com",
            "client_secret" -> "YcoCdjWna_-EFvoTxwx_q2uK",
            "redirect_uri" -> "https://ayamel.byu.edu/auth/google/callback/",
            "grant_type" -> "authorization_code"
		  )
        ).flatMap {
          response: Response =>
            try {
              val json = response.json
			  // TODO: print stuff out here so we can examine the actual structure of the JSON object
			  val id_token = json \ "id_token"
			  
				Errors.notFound
          /*
			val id_json = decodeToken(id_token)
			val email = id_json \ "email"
          val user = Authentication.getAuthenticatedUser(email, 'google, None, Some(email))

		  //Need to figure out how to get the action from the login method
          //if (action == "merge")
          //  Authentication.merge(user)
          //else
            Authentication.login(user, path)
        */

            } catch {
              case _: Exception => {
                Logger.debug("Error decoding:\n"+response.body)
				Errors.notFound
              }
            }
        }
      }
  }

}
