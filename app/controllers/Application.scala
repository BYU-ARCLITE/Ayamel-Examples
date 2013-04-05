package controllers

import authentication.Authentication
import play.api.mvc._
import models.{Content, Course}
import concurrent.ExecutionContext
import ExecutionContext.Implicits.global
import service.{SerializationTools, VideoTools}
import dataAccess.PlayGraph

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

        val content = SerializationTools.serializeMap(Map(
          "status" -> "ok",
          "contentId" -> "38",
          "advanceMethod" -> "time",
          "advanceTime" -> "5"
        ))
        PlayGraph.Author.NodeContent.update(10, content).map(json => Ok(json))

//        VideoTools.generateThumbnail("http://arclite.byu.edu/hvmirror/french/Dreyfus.mp4").map(url => {
//          Ok(url)
//        })



//        Ok(Content.findById(35).toString)

//        PlayGraph.Player.update(4).map(json =>
//          Ok(json)
//        )
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