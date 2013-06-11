package controllers

import play.api.mvc.{Action, Controller}
import controllers.authentication.Authentication
import play.api.Play
import models.Content
import play.api.Play.current

/**
 * Created with IntelliJ IDEA.
 * User: camman3d
 * Date: 6/11/13
 * Time: 3:24 PM
 * To change this template use File | Settings | File Templates.
 */
object CaptionAider extends Controller {
  def view = Authentication.authenticatedAction() {
    implicit request =>
      implicit user =>
        val resourceLibraryUrl = Play.configuration.getString("resourceLibrary.baseUrl").get
        val content = Content.findById(38).get
        Ok(views.html.captionAider.view(content, resourceLibraryUrl))
  }
}
