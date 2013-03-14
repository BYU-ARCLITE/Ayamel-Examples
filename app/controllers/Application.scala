package controllers

import play.api._
import libs.json.Json
import libs.MimeTypes
import libs.ws.WS
import play.api.mvc._
import anorm.NotAssigned
import models.User
import concurrent.{Await, ExecutionContext}
import concurrent.duration._
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
//        val videoGroups = VideoGroup.list
//        Ok(views.html.application.watch(videoGroups))
      Ok("Watch")
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
//    val uri = "http://arclite.byu.edu/hvmirror/something.mp4"
//    val extension = uri.substring(uri.lastIndexOf("."))
//    val mime = MimeTypes.forExtension(extension)



    // Now make the simple translation call
//    val response = Await.result(
//      WS.url("http://translate.google.com/researchapi/translate")
//        .withQueryString("sl" -> "en", "tl" -> "fr", "q" -> "hat")
//        .withHeaders("Authorization" -> ("GoogleLogin auth=" + authCode)).get().map(_.xml),
//      30 seconds
//    )
//
////    val googleTranslateNamespace =
//    Ok((response \ "entry" \ "translation").text)
    Ok
  }


  def apiWrapperGet = Action {
    request =>
      Async {
        WS.url(request.queryString("url")(0)).get().map(response => Ok(response.json).as("application/json"))
      }
  }

}