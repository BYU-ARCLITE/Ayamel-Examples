package controllers

import play.api.mvc.{Action, Controller}
import controllers.authentication.Authentication
import models.{HelpPage, User}
import play.api.Play
import Play.current
import dataAccess.ResourceController

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
      Ok(views.html.help.toc())
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
          if (helpPage.isDefined)
            Ok(views.html.help.edit(helpPage.get))
          else
            Errors.notFound
        }
  }

  def save(id: Long) = Authentication.authenticatedAction(parse.urlFormEncoded) {
    implicit request =>
      implicit user =>
        Authentication.enforceRole(User.roles.admin) {

          val helpPage = HelpPage.findById(id)
          if (helpPage.isDefined) {
            val contents = request.body("contents")(0)
            helpPage.get.copy(contents = contents).save
            Redirect(routes.HelpPages.view(helpPage.get.id.get)).flashing("info" -> "Help page saved.")
          } else
            Errors.notFound
        }
  }

}
