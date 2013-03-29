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
import service.SerializationTools

object Application extends Controller {

  def index = Action {
    implicit request =>
      Ok(views.html.application.index())
  }

  def home = Authentication.authenticatedAction() {
    implicit request =>
      implicit user =>
        Ok(views.html.application.home())
  }

  def test = Action(parse.tolerantText) {
    request =>

//      Logger.debug("Headers: " + request.headers)
//      Logger.debug("Body: " + request.body)
//      val obj = Json.obj(
//        "success" -> true
//      )
//      Ok(obj)

      val someMap = Map("one" -> "two", "three" -> "4")
      val str = SerializationTools.serializeMap(someMap)
      Ok(str)
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