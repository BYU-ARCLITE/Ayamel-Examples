package controllers

import authentication.Authentication
import play.api.mvc._
import models.{Content, Course}
import javax.imageio.ImageIO
import java.io.File
import service.{TimeTools, ResourceHelper, ImageTools}
import scala.concurrent.ExecutionContext
import ExecutionContext.Implicits.global
import play.api.libs.json.{JsObject, Json}

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

}