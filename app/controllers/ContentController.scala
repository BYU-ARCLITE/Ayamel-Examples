package controllers

import play.api.mvc.{Result, Request, Controller}
import service.{ContentManagement, Authentication}
import models.Content

/**
 * Created with IntelliJ IDEA.
 * User: camman3d
 * Date: 3/22/13
 * Time: 1:27 PM
 * To change this template use File | Settings | File Templates.
 */
object ContentController extends Controller {

  def getContent(id: Long)(f: Content => Result)(implicit request: Request[_]) = {
    val content = Content.findById(id)
    if (content.isDefined) {
      f(content.get)
    } else
      NotFound
  }

  def createPage = Authentication.authenticatedAction() {
    implicit request =>
      implicit user =>
        Ok(views.html.content.create())
  }

  def create = Authentication.authenticatedAction(parse.multipartFormData) {
    implicit request =>
      implicit user =>

        // Collect the information
        val data = request.body.dataParts.mapValues(_(0))
        val contentType = Symbol(data("contentType"))
        val title = data("title")
        val description = data("description")
        val url = data("url")
        val thumbnail = data("thumbnail")

        // Create the content
        ContentManagement.createContent(title, description, url, thumbnail, user, contentType)

        Redirect(routes.Application.home()).flashing("success" -> "Content added")
  }

  def view(id: Long) = Authentication.authenticatedAction() {
    implicit request =>
      implicit user =>
        getContent(id) {
          content =>
            Ok(views.html.content.view(content))
        }
  }

  def delete(id: Long) = Authentication.authenticatedAction() {
    implicit request =>
      implicit user =>
        getContent(id) {
          content =>
            content.delete()
            Redirect(routes.ContentController.mine()).flashing("success" -> "Content deleted.")
        }
  }

  def mine = Authentication.authenticatedAction() {
    implicit request =>
      implicit user =>
        Ok(views.html.content.mine())
  }


}
