package controllers.authentication

import play.api.mvc.{Action, Controller}
import play.api.libs.ws.WS
import concurrent.ExecutionContext
import ExecutionContext.Implicits.global

/**
 * Created with IntelliJ IDEA.
 * User: camman3d
 * Date: 2/15/13
 * Time: 12:45 PM
 * To change this template use File | Settings | File Templates.
 */
object Cas extends Controller {
  def login = Action {
    implicit request =>
      val service = routes.Cas.callback().absoluteURL()
      Redirect("https://cas.byu.edu:443?service=" + service, 302)
  }

  def callback = Action {
    implicit request =>
      // Retrieve the TGT
      val tgt = request.queryString("ticket")(0)
      val service = routes.Cas.callback().absoluteURL()

      // Verify the TGT with CAS to get the user id
      val url = "https://cas.byu.edu/cas/serviceValidate?ticket=" + tgt + "&service=" + service
      Async {
        WS.url(url).get().map(request => {
          val xml = request.xml
          val username = ((xml \ "authenticationSuccess") \ "user").text
          logic.Authentication.loginCas(username)
        })
      }
  }
}
