package controllers.authentication

import play.api.mvc.{Result, Action, Controller}
import play.api.libs.ws.WS
import play.api.Play
import play.api.Play.current
import scala.concurrent.{Await, Future, ExecutionContext}
import scala.concurrent.duration._
import ExecutionContext.Implicits.global

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

      // Don't use Async, but rather wait for a period of time because CAS sometimes times out.
      val r: Future[Result] = WS.url(url).get().map(response => {
        val xml = response.xml
        val username = ((xml \ "authenticationSuccess") \ "user").text
        val user = Authentication.getAuthenticatedUser(username, 'cas)

        if (action == "merge")
          Authentication.merge(user)
        else
          Authentication.login(user, path)
      })
      try {
        Await.result(r, 20 seconds)
      } catch {
        case _: Throwable =>
          val advice = Play.configuration.getString("smtp.address") match {
            case Some(address) => "Either log in with a different method or <a href=\"" + address + "\">notify an administrator</a>."
            case None => "Try an alternate log in method."
          }
          Redirect(controllers.routes.Application.index()).flashing("error" -> ("An error occurred with CAS. " + advice))
      }
  }
}
