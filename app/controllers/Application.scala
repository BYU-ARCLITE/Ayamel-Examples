package controllers

import authentication.Authentication
import play.api._
import libs.json.{JsString, Reads, JsObject, Json}
import libs.ws.WS
import play.api.mvc._
import anorm.NotAssigned
import models.{Content, Course}
import concurrent.ExecutionContext
import ExecutionContext.Implicits.global
import java.io.{ByteArrayInputStream, ObjectInputStream, ByteArrayOutputStream, ObjectOutputStream}
import org.apache.commons.codec.binary.Base64
import service.{VideoTools, SerializationTools}

object Application extends Controller {

  def index = Action {
    implicit request =>
      val user = Authentication.getUserFromRequest()
      if (user.isDefined) 
        Redirect(controllers.routes.Application.home()).withSession("userId" -> user.get.id.get.toString)
      else
        Ok(views.html.application.index())
  }

  def home = Authentication.authenticatedAction() {
    implicit request =>
      implicit user =>
        Ok(views.html.application.home())
  }

  def test = Action(parse.tolerantText) {
    request =>

      Async {
        VideoTools.generateThumbnail("http://arclite.byu.edu/hvmirror/french/Dreyfus.mp4").map(url => {
          Ok(url)
        })
      }
  }

  def search = Authentication.authenticatedAction() {
    implicit request =>
      implicit user =>

        // Search each applicable model
        val query = request.queryString("query")(0)
        val courses = Course.search(query)
        val content = Content.search(query)

        Ok(views.html.application.search(content, courses))
  }

  def about = Authentication.authenticatedAction() {
    implicit request =>
      implicit user =>

        Ok(views.html.application.about())
  }

  def terms = Authentication.authenticatedAction() {
    implicit request =>
      implicit user =>

        Ok(views.html.application.terms())
  }

  def policy = Authentication.authenticatedAction() {
    implicit request =>
      implicit user =>

        Ok(views.html.application.policy())
  }

}