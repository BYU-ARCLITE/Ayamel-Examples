package controllers

import play.api._
import libs.json.Json
import libs.MimeTypes
import libs.ws.WS
import play.api.mvc._
import anorm.NotAssigned
import models.{MovieGroup, Movie, User}
import concurrent.ExecutionContext
import ExecutionContext.Implicits.global

object Application extends Controller {
  
  def index = Action {
    implicit request =>
      Ok(views.html.application.index())
  }

  def home = logic.Authentication.authenticatedAction {
    implicit request =>
      implicit user =>
        Ok(views.html.application.home())
  }

  def watch = logic.Authentication.authenticatedAction {
    implicit request =>
      implicit user =>
        val movieGroups = MovieGroup.list
        Ok(views.html.application.watch(movieGroups))
  }

  def edit = logic.Authentication.authenticatedAction {
    implicit request =>
      implicit user =>
        Ok(views.html.application.edit())
  }

  def code = logic.Authentication.authenticatedAction {
    implicit request =>
      implicit user =>
        Ok(views.html.application.code())
  }

  def test = Action {
    val uri = "http://arclite.byu.edu/hvmirror/something.mp4"
    val extension = uri.substring(uri.lastIndexOf("."))
    val mime = MimeTypes.forExtension(extension)
    Ok(mime.toString)
  }


  def apiWrapperGet = Action {
    request =>
      Async {
        WS.url(request.queryString("url")(0)).get().map(response => Ok(response.json).as("application/json"))
      }
  }

}