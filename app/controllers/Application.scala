package controllers

import authentication.Authentication
import play.api.mvc._
import models.{Setting, Feedback, Content, Course}
import service.EmailTools
import play.api.libs.json.{JsObject, Json}
import play.api.Play
import play.api.Play.current
import java.net.{URL, URI, URLEncoder}

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

  def test = Action {
    request =>
    //      val s = TimeTools.colonTimecodeToSeconds("23:03")
    //      Ok(s.toString)

//      val json1 = Json.obj(
//        "val1" -> 4,
//        "val2" -> true,
//        "val3" -> "Yes"
//      )
//
//      val json2 = Json.obj(
//        "val1" -> 89,
//        "attributes" -> Json.obj(
//          "attr1" -> "something"
//        )
//      )
//
//      val json3 = Json.obj(
//        "attr1" -> "something else"
//      )
//
//      val attrs = Json.obj(
//        "attributes" -> ((json2 \ "attributes").asOpt[JsObject].getOrElse(Json.obj()) ++ json3)
//      )

//      val url = URLEncoder.encode("http://test.com/something.mp4?blah=that", "utf-8")

      def prepareUrl(url: String): String = {
        val urlObj = new URL(url)
        new URI(urlObj.getProtocol, urlObj.getHost, urlObj.getPath, null).toString
      }
//
//      val str = "http://test.com/something else.mp4?blah=that"

//      val url = uri.toURL.toString

      val url = prepareUrl("http://www.test.com/mush/something else.mp4?blah=that")
      Ok(url)
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