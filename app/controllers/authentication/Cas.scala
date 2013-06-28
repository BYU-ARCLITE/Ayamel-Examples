package controllers.authentication

import play.api.mvc.{Action, Controller}
import play.api.libs.ws.WS
import concurrent.ExecutionContext
import ExecutionContext.Implicits.global
import models.User
import anorm.NotAssigned
import java.net.URLEncoder

/**
 * Controller which handles BYU CAS authentication.
 */
object Cas extends Controller {

  /**
   * Redirects to the CAS login page.
   */
  def login(action: String, path: String = "") = Action {
    implicit request =>
      val service = routes.Cas.callback(action, path).absoluteURL()
      Redirect("https://cas.byu.edu:443?service=" + service, 302)
  }

  /**
   * When the CAS login is successful, it is redirected here, where the TGT and login are taken care of.
   */
  def callback(action: String, path: String = "") = Action {
    implicit request =>
    // Retrieve the TGT
      val tgt = request.queryString("ticket")(0)
      val casService = routes.Cas.callback(action, path).absoluteURL()

      // Verify the TGT with CAS to get the user id
      val url = "https://cas.byu.edu/cas/serviceValidate?ticket=" + tgt + "&service=" + casService
      Async {
        WS.url(url).get().map(response => {
          val xml = response.xml
          val username = ((xml \ "authenticationSuccess") \ "user").text
          val user = Authentication.getAuthenticatedUser(username, 'cas)

          if (action == "merge")
            Authentication.merge(user)
          else
            Authentication.login(user, path)
        })
      }
  }
}
