package controllers

import authentication.Authentication
import play.api._
import libs.json.Json
import libs.ws.WS
import play.api.mvc._
import anorm.NotAssigned
import models.Course
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


  def apiWrapperGet = Action {
    request =>
      Async {
        WS.url(request.queryString("url")(0)).get().map(response => Ok(response.json).as("application/json"))
      }
  }

  def profile = Authentication.authenticatedAction() {
    implicit request =>
      implicit user =>

        Ok(views.html.application.profile())
  }

  def changeName = Authentication.authenticatedAction(parse.urlFormEncoded) {
    request =>
      user =>

      // Change the name
        val newName = request.body("monkeyBrains")(0)
        user.copy(name = Some(newName)).save

        // Redirect
        Redirect(routes.Application.profile()).flashing("success" -> "Yay! You changed your name.")
  }



}