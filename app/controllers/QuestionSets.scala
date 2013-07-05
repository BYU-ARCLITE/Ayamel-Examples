package controllers

import play.api.mvc.Controller
import play.api.Play
import play.api.Play.current
import controllers.authentication.Authentication

/**
 * Created with IntelliJ IDEA.
 * User: josh
 * Date: 7/5/13
 * Time: 10:40 AM
 * To change this template use File | Settings | File Templates.
 */
object QuestionSets extends Controller {
  val createFormScript = Play.configuration.getString("exercises.createFormScript").get
  val getResponseIndexScript = Play.configuration.getString("exercises.getResponseIndexScript").get
  val gradeFormScript = Play.configuration.getString("exercises.gradeFormScript").get

  def about(id: Long) = Authentication.authenticatedAction() {
    implicit request =>
      implicit user =>
        ContentController.getContent(id) {
          content =>
          // Check the content type
            if (content.contentType == 'questions) {
              // Check that the user can view the content
              if (content isVisibleBy user) {
                Ok("TODO: View question set")
              } else {
                Errors.forbidden
              }
            } else {
              Redirect(routes.ContentController.view(id))
            }
        }
  }
}
