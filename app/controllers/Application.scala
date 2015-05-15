package controllers

import authentication.Authentication
import play.api.mvc._
import models._
import service.EmailTools
import models.Content
import play.api.libs.json.{JsNull, Json}

object Application extends Controller {

  /**
   * The landing page. The login screen if the user isn't logged in. The home page if the user is.
   */
  def index = Action {
    implicit request =>
      val user = Authentication.getUserFromRequest()
      if (user.isDefined)
        Redirect(controllers.routes.Application.home())
      else {
        val path = request.queryString.get("path").map(path => path(0)).getOrElse("")
        Ok(views.html.application.index(path))
      }
  }

  /**
   * The home page
   */
  def home = Authentication.authenticatedAction() {
    implicit request =>
      implicit user =>
        Ok(views.html.application.home(Course.list))
  }

  /**
   * Searches and shows the results
   */
  def search = Authentication.authenticatedAction() {
    implicit request =>
      implicit user =>
        request.queryString.get("query").flatMap(_.headOption).map { query =>
          (Content.search(query), Course.search(query))
        }.getOrElse((Nil, Nil)) match {
          case (content, courses) =>
            Ok(views.html.application.search(content, courses))
        }
  }

  /**
   * The about page
   */
  def about = Authentication.authenticatedAction() {
    implicit request =>
      implicit user =>
        Ok(views.html.application.about())
  }

  /**
   * The Terms of Use page
   */
  def terms = Authentication.authenticatedAction() {
    implicit request =>
      implicit user =>
        Ok(views.html.application.terms())
  }

  /**
   * The Privacy Policy page
   */
  def policy = Authentication.authenticatedAction() {
    implicit request =>
      implicit user =>
        Ok(views.html.application.policy())
  }

  /**
   * Saves feedback submissions (bug reports, suggestions, ratings)
   */
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

  /**
   * Saves feedback submitted on an error
   */
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