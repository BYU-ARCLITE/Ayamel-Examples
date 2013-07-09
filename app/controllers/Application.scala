package controllers

import authentication.Authentication
import play.api.mvc._
import models._
import service.EmailTools
import models.Content
import dataAccess.ResourceController
import play.api.libs.json.{Json, JsObject}

object Application extends Controller {

  def index = Action {
    implicit request =>
      val user = Authentication.getUserFromRequest()
      if (user.isDefined)
        Redirect(controllers.routes.Application.home()).withSession("userId" -> user.get.id.get.toString)
      else {
        val path = request.queryString.get("path").map(path => path(0)).getOrElse("")
        Ok(views.html.application.index(path))
      }
  }

  def home = Authentication.authenticatedAction() {
    implicit request =>
      implicit user =>
        Ok(views.html.application.home())
  }

  def test = Action {
    implicit request =>

      import concurrent.ExecutionContext.Implicits.global
      Async {
        ResourceController.getResource("7bba6dab-95eb-d555-66f1-450bb9a8adc5").map(r => {
          val resource = r \ "resource"

          val label = "Oogey boogey"
          val languages = List("asdfasdfasdf")
          val kind = "Very"

          val updatedFile = (resource \ "content" \ "files")(0).as[JsObject] ++ Json.obj("attributes" -> Json.obj("kind" -> kind))
          val updatedResource = resource.as[JsObject] ++ Json.obj(
            "title" -> label,
            "languages" -> languages,
            "content" -> Json.obj("files" -> List(updatedFile))
          )
          Ok(updatedResource)
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

  def saveFeedback = Authentication.authenticatedAction(parse.urlFormEncoded) {
    request =>
      user =>
        val category = request.body("category")(0)
        val description = request.body("description")(0)
        val feedback = Feedback.save(user, category, description)

        // Send out emails
        if (category == "problem")
          EmailTools.sendAdminNotificationEmail("notifications.notifyOn.bugReport", feedback.getProblemInfo)
        if (category == "suggestion")
          EmailTools.sendAdminNotificationEmail("notifications.notifyOn.suggestion", feedback.getSuggestionInfo)
        if (category == "rating")
          EmailTools.sendAdminNotificationEmail("notifications.notifyOn.rating", feedback.getThoughtInfo)
        Ok
  }

  def saveErrorFeedback = Authentication.authenticatedAction(parse.urlFormEncoded) {
    request =>
      user =>
        val description = request.body("description")(0)
        val errorCode = request.body("errorCode")(0)
        val userId = user.id.get
        Feedback.save(user, "error", "Error Code: " + errorCode + ", Description: " + description)
        EmailTools.sendAdminNotificationEmail("notifications.notifyOn.errorReport", (errorCode, description, userId))
        Ok
  }

}