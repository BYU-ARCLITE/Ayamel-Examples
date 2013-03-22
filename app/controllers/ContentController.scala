package controllers

import play.api.mvc.Controller
import service.{ContentManagement, Authentication}

/**
 * Created with IntelliJ IDEA.
 * User: camman3d
 * Date: 3/22/13
 * Time: 1:27 PM
 * To change this template use File | Settings | File Templates.
 */
object ContentController extends Controller {

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
        val title = data("title")
        val description = data("description")
        val url = data("url")
        val thumbnail = data("thumbnail")

        // Create the content
        ContentManagement.createVideo(title, description, url, thumbnail, user)

        Redirect(routes.Application.home()).flashing("success" -> "Content added")
  }

  def view(id: Long) = Authentication.authenticatedAction() {
    implicit request =>
      implicit user =>
        Ok("TODO: View")
  }

  def mine = TODO

}
