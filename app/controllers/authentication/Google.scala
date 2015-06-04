package controllers.authentication

import play.api.mvc.{Action, Controller}
import java.security.SecureRandom
import play.api.libs.ws._
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
      val openID = "https://accounts.google.com/o/oauth2/auth"

      val random = SecureRandom()
      val myVal = Array.Fill[Byte](30)(0)
      val state_token = random.nextBytes(myVal).mkString



      redirect("https://accounts.google.com/o/oauth2/auth", Map[String, String]
        ("client_id" -> "1052219675733-16ul2rbrpm05reqe8cra14ib4m0j8bt8.apps.googleusercontent.com", 
          "response_type" -> "code"
          "scope" -> "openid email"
          "redirect_uri" -> "https://ayamel.byu.edu/auth/google/callback/"
          "state" -> state_token
        )
      )
  }


  /**
   * When the Google login is successful, it is redirected here, where user info is extracted and the user is logged in.
   */
  def callback(action: String, path: String = "") = Action {
  
  // Confirm anti-forgery state token
  
    implicit request =>
      val code = request.queryString.get("code").get
      Async {
        WS.url("Place Holder for the token endpoint ").post("code" -> code, 
          "client_id" -> "1052219675733-16ul2rbrpm05reqe8cra14ib4m0j8bt8.apps.googleusercontent.com",
          "client_secret" -> "YcoCdjWna_-EFvoTxwx_q2uK",
          "redirect_uri" -> "https://ayamel.byu.edu/auth/google/callback/",
          "grant_type" -> "authorization_code"
          ).flatMap{

          /*
          OUR PSEUDO CODE
          4.)
          >> We're getting a JSON object and we want to extract the fields from it

          >> extract from JSON object:
            - access_token
            - id_token
            - expires_in
            - token_type
            - refresh_token
          
          5.)
          >> Turning ID_token into decoded JSON object and extract data - it is signed and base64 coded

          >> get email address out of ID_token
          */

          val user = Authentication.getAuthenticatedUser(email, 'google, None, Some(email))

          if (action == "merge")
            Authentication.merge(user)
          else
            Authentication.login(user, path)

        }
      }
  }

}
