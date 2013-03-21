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
import service.oauth.PlayOAuth
import play.core.parsers.FormUrlEncodedParser
import service.Authentication

object Application extends Controller {
  
  def index = Action {
    implicit request =>
      Ok(views.html.application.index())
  }

  def home = service.Authentication.authenticatedAction {
    implicit request =>
      implicit user =>
        Ok(views.html.application.home())
  }

  def watch = service.Authentication.authenticatedAction {
    implicit request =>
      implicit user =>
//        val videoGroups = VideoGroup.list
//        Ok(views.html.application.watch(videoGroups))
      Ok("Watch")
  }

  def edit = service.Authentication.authenticatedAction {
    implicit request =>
      implicit user =>
        Ok(views.html.application.edit())
  }

  def code = service.Authentication.authenticatedAction {
    implicit request =>
      implicit user =>
        Ok(views.html.application.code())
  }

  def test = Action(parse.tolerantText) {
    request =>
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

    val valid = PlayOAuth.verify(request, "", "key1")

    //BodyParsers.parse.text.

    val x = request.map(str => FormUrlEncodedParser.parse(request.body, request.charset.getOrElse("utf-8")))

    Ok(x.body + " -- " + valid)
  }


  def apiWrapperGet = Action {
    request =>
      Async {
        WS.url(request.queryString("url")(0)).get().map(response => Ok(response.json).as("application/json"))
      }
  }

  def profile = service.Authentication.authenticatedAction {
    implicit request =>
      implicit user =>

        Ok(views.html.application.profile(user))
  }

  def changeName = service.Authentication.authenticatedAction {
    request =>
      user =>

        // Change the name
        val params = request.body.asFormUrlEncoded.get
        val newName = params("monkeyBrains")(0)
        user.copy(name = Some(newName)).save

        // Redirect
        Redirect(routes.Application.profile()).flashing("success" -> "Yay! You changed your name.")
  }

}