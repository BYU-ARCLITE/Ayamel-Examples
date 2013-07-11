package controllers.ajax

import play.api.mvc.Controller
import controllers.authentication.Authentication
import play.api.libs.json.{JsObject, JsArray}
import models.Content

/**
 * Created with IntelliJ IDEA.
 * User: josh
 * Date: 7/1/13
 * Time: 11:38 AM
 * To change this template use File | Settings | File Templates.
 */
object ContentLister extends Controller {
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
