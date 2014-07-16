package controllers

import play.api.mvc.{Action, Controller}
import controllers.authentication.Authentication
import models.{HelpPage, User}
import dataAccess.ResourceController
import anorm.NotAssigned

/**
 * Controller dealing with help pages
 */
object HelpPages extends Controller {

  /**
   * Table of contents view
   */
  def tableOfContents = Action {
    implicit request =>
      implicit val user = request.session.get("userId").flatMap(id => User.findById(id.toLong))
      val pages = HelpPage.list.groupBy(_.category)
      Ok(views.html.help.toc(pages, ResourceController.baseUrl))
  }

  /**
   * View a particular help page
   * @param id The ID of the help page
   */
  def view(id: Long) = Action {
    implicit request =>
      implicit val user = request.session.get("userId").flatMap(id => User.findById(id.toLong))
      HelpPage.findById(id).map( helpPage =>
        Ok(views.html.help.view(helpPage, ResourceController.baseUrl))
      ).getOrElse(Errors.notFound)
  }

  /**
   * Edit a particular help page
   * @param id The ID of the help page
   */
  def edit(id: Long) = Authentication.authenticatedAction() {
    implicit request =>
      implicit user =>
        Authentication.enforcePermission("admin") {

          val helpPage = HelpPage.findById(id)
          Ok(views.html.help.edit(helpPage))
        }
  }

  /**
   * Delete a particular help page
   * @param id The ID of the help page
   */
  def delete(id: Long) = Authentication.authenticatedAction() {
    implicit request =>
      implicit user =>
        Authentication.enforcePermission("admin") {

          HelpPage.findById(id).map(_.delete())
          Redirect(routes.HelpPages.tableOfContents()).flashing("info" -> "Help page deleted.")
        }
  }

  /**
   * Save/update a particular help page
   * @param id The ID of the help page
   */
  def save(id: Long) = Authentication.authenticatedAction(parse.urlFormEncoded) {
    implicit request =>
      implicit user =>
        Authentication.enforcePermission("admin") {

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
