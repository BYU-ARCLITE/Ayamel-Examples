package controllers

import authentication.Authentication
import play.api._
import libs.json.Json
import libs.ws.WS
import play.api.mvc._
import anorm.NotAssigned
import models.{Content, Course}
import concurrent.ExecutionContext
import ExecutionContext.Implicits.global

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

      Logger.debug("Headers: " + request.headers)
      Logger.debug("Body: " + request.body)
      val obj = Json.obj(
        "success" -> true
      )
      Ok(obj)
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


}