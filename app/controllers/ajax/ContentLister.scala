package controllers.ajax

import play.api.mvc.Controller
import controllers.authentication.Authentication
import play.api.libs.json.{JsObject, JsArray}
import models.Content

/**
 * Controller for listing out content the user can see. For AJAX calls. These need to be cross-domain so as to work with
 * the PlayGraph editor.
 */
object ContentLister extends Controller {

  /**
   * Lists content the user owns.
   */
  def mine = Authentication.authenticatedAction() {
    implicit request =>
      implicit user =>
        val content = user.getContent.map(_.toJson)
        val origin = request.headers.get("Origin").getOrElse("*")
        Ok(JsArray(content)).withHeaders(
          "Access-Control-Allow-Origin" -> origin,
          "Access-Control-Allow-Credentials" -> "true"
        )
  }

  /**
   * Lists the courses the user is in and the content under each course.
   */
  def course = Authentication.authenticatedAction() {
    implicit request =>
      implicit user =>
        val courses = user.getEnrollment
        val content = courses.map(course => (course.name, JsArray(course.getContent.map(_.toJson))))
        val origin = request.headers.get("Origin").getOrElse("*")
        Ok(JsObject(content)).withHeaders(
          "Access-Control-Allow-Origin" -> origin,
          "Access-Control-Allow-Credentials" -> "true"
        )
  }

  /**
   * Lists the public content
   */
  def public = Authentication.authenticatedAction() {
    implicit request =>
      implicit user =>
        val content = Content.listPublic.map(_.toJson)
        val origin = request.headers.get("Origin").getOrElse("*")
        Ok(JsArray(content)).withHeaders(
          "Access-Control-Allow-Origin" -> origin,
          "Access-Control-Allow-Credentials" -> "true"
        )
  }

  /**
   * Returns a particular content
   * @param id The ID of the content
   */
  def get(id: Long) = Authentication.authenticatedAction() {
    implicit request =>
      implicit user =>
        val content = Content.findById(id)
        val origin = request.headers.get("Origin").getOrElse("*")
        if (content.isDefined)
          Ok(content.get.toJson).withHeaders(
            "Access-Control-Allow-Origin" -> origin,
            "Access-Control-Allow-Credentials" -> "true"
          )
        else
          Forbidden
  }
}
