package controllers

import play.api.mvc.{Action, Controller}
import controllers.authentication.Authentication
import models.{HelpPage, User}
import play.api.Play
import Play.current
import dataAccess.ResourceController
import anorm.NotAssigned

/**
 * Created with IntelliJ IDEA.
 * User: camman3d
 * Date: 5/7/13
 * Time: 4:44 PM
 * To change this template use File | Settings | File Templates.
 */
object HelpPages extends Controller {

  def tableOfContents = Action {
    implicit request =>
      implicit val user = request.session.get("userId").flatMap(id => User.findById(id.toLong))
        val pages = HelpPage.list.groupBy(_.category)
        Ok(views.html.help.toc(pages))
  }

  def view(id: Long) = Action {
    implicit request =>
      implicit val user = request.session.get("userId").flatMap(id => User.findById(id.toLong))
      val helpPage = HelpPage.findById(id)
      if (helpPage.isDefined) {
        Ok(views.html.help.view(helpPage.get, ResourceController.baseUrl))
      } else
        Errors.notFound
  }

  def edit(id: Long) = Authentication.authenticatedAction() {
    implicit request =>
      implicit user =>
        Authentication.enforceRole(User.roles.admin) {

          val helpPage = HelpPage.findById(id)
          Ok(views.html.help.edit(helpPage))
        }
  }

  def delete(id: Long) = Authentication.authenticatedAction() {
    implicit request =>
      implicit user =>
        Authentication.enforceRole(User.roles.admin) {

          HelpPage.findById(id).map(_.delete())
          Redirect(routes.HelpPages.tableOfContents()).flashing("info" -> "Help page deleted.")
        }
  }

  def save(id: Long) = Authentication.authenticatedAction(parse.urlFormEncoded) {
    implicit request =>
      implicit user =>
        Authentication.enforceRole(User.roles.admin) {

          val helpPage = HelpPage.findById(id)
          val title = request.body("title")(0)
          val contents = request.body("contents")(0)
          val category = request.body("category")(0)

          if (helpPage.isDefined) {
            helpPage.get.copy(title = title, contents = contents, category = category).save
            Redirect(routes.HelpPages.view(helpPage.get.id.get)).flashing("info" -> "Help page saved.")
          } else {
            // Create new
            val newHelpPage = HelpPage(NotAssigned, title, contents, category).save
            Redirect(routes.HelpPages.view(newHelpPage.id.get)).flashing("info" -> "Help page created.")
          }
        }
  }

}
