package controllers

import play.api.mvc.{Action, Controller}
import controllers.authentication.Authentication
import service.HashTools
import dataAccess.Quizlet
import play.api.Logger
import scala.concurrent.ExecutionContext
import ExecutionContext.Implicits.global
import models.WordListEntry

/**
 * Created with IntelliJ IDEA.
 * User: josh
 * Date: 7/12/13
 * Time: 4:35 PM
 * To change this template use File | Settings | File Templates.
 */
object WordLists extends Controller {

  def add = Authentication.authenticatedAction(parse.urlFormEncoded) {
    implicit request =>
      implicit user =>
        user.addWord(request.body("word")(0), request.body("language")(0))
        Ok
  }

  def view = Authentication.authenticatedAction() {
    implicit request =>
      implicit user =>
        val wordList = user.getWordList
        Ok(views.html.words.view(wordList))
  }

  def deleteWord(id: Long) = Authentication.authenticatedAction() {
    implicit request =>
      implicit user =>
        WordListEntry.findById(id).map(_.delete())
        Redirect(routes.WordLists.view()).flashing("info" -> "Word deleted.")
  }

  def export = Authentication.authenticatedAction(parse.multipartFormData) {
    implicit request =>
      user =>
        val token = request.body.dataParts("token")(0)
        val title = request.body.dataParts("title")(0)
        val termLanguage = request.body.dataParts("lang_terms")(0)
        val definitionLanguage = request.body.dataParts("lang_definitions")(0)
        val terms = request.body.dataParts("terms[]").zip(request.body.dataParts("definitions[]")).toList

        Async {
          Quizlet.createSet(token, title, terms, termLanguage, definitionLanguage).map(url => Ok(url))
        }
  }

  def authorize = Authentication.authenticatedAction() {
    implicit request =>
      user =>
        val data = Map(
          "response_type" -> Seq("code"),
          "client_id" -> Seq(Quizlet.clientId),
          "scope" -> Seq("write_set"),
          "state" -> Seq(HashTools.md5Hex(request.session.toString)),
          "redirect_uri" -> Seq(routes.WordLists.authorizeCallback().absoluteURL())
        )
        Redirect("https://quizlet.com/authorize/", data)
  }

  def authorizeCallback = Authentication.authenticatedAction() {
    implicit request =>
      user =>
      // Check for an error
        if (request.queryString.contains("error")) {
          Ok(views.html.words.authCode(false, ""))
        } else {

          // Check the state
          // val state = HashTools.md5Hex(request.session.toString)

          // Get the auth token
          val code = request.queryString("code")(0)
          Async {

            // Get the access token from the code
            Quizlet.getAuthToken(code).map(token => {
              Ok(views.html.words.authCode(true, token))
            })
          }
        }
  }
}
