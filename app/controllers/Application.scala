package controllers

import authentication.Authentication
import play.api.mvc._
import models.{Feedback, Content, Course}
import service.EmailTools
import play.api.libs.json.{JsObject, Json}
import play.api.Play
import play.api.Play.current

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

      val json1 = Json.obj(
        "val1" -> 4,
        "val2" -> true,
        "val3" -> "Yes"
      )

      val json2 = Json.obj(
        "val1" -> 89,
        "attributes" -> Json.obj(
          "attr1" -> "something"
        )
      )

      val json3 = Json.obj(
        "attr1" -> "something else"
      )

      val attrs = Json.obj(
        "attributes" -> ((json2 \ "attributes").asOpt[JsObject].getOrElse(Json.obj()) ++ json3)
      )

      Ok(json2 ++ attrs)
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
        Feedback(user.id.get, category, description).save
        Ok
  }

  def saveErrorFeedback = Authentication.authenticatedAction(parse.urlFormEncoded) {
    request =>
      user =>
        val description = request.body("description")(0)
        val errorCode = request.body("errorCode")(0)
        val userId = user.id.get

        val to = Play.configuration.getString("feedback.emails").get.split(",").map(s => (s.trim, s.trim)).toList
        EmailTools.sendEmail(to, "Ayamel - Error report") {
          s"""
            |A user has provided feedback on an error.
            |Error code: $errorCode
            |Description: $description
            |User ID: $userId
          """.stripMargin
        } {
          s"""
            |<p>A user has provided feedback on an error.</p>
            |<p>Error code: <code>$errorCode</code></p>
            |<p>Description: $description</p>
            |<p>User ID: <code>$userId</code></p>
          """.stripMargin
        }
        Ok
  }

}