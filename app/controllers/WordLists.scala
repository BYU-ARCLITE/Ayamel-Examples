package controllers

import play.api.mvc.{Action, Controller}
import controllers.authentication.Authentication
import service.HashTools
import dataAccess.Quizlet
import play.api.Logger
import scala.concurrent.ExecutionContext
import ExecutionContext.Implicits.global

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

  def export = Authentication.authenticatedAction() {
    implicit request =>
      implicit user =>
        val data = Map(
          "response_type" -> Seq("code"),
          "client_id" -> Seq(Quizlet.clientId),
          "scope" -> Seq("write_set"),
          "state" -> Seq(HashTools.md5Hex(request.session.toString)),
          "redirect_uri" -> Seq(routes.WordLists.authorize().absoluteURL() + "?lang=" + request.queryString("language")(0))
        )
        Redirect("https://quizlet.com/authorize/", data)
  }

  def authorize = Authentication.authenticatedAction() {
    implicit request =>
      user =>
        // Check for an error
        if (request.queryString.contains("error")) {
          Ok(request.queryString("error")(0))
        } else {

          // Check the state
//          val state = HashTools.md5Hex(request.session.toString)

          // Get the auth token
          val code = request.queryString("code")(0)
          Async {
            Quizlet.getAuthToken(code).flatMap(token => {

              // Export the list
              // TODO: Get the two letter language code
              // TODO: Get the language name
              // TODO: Get the definitions
              val language = request.queryString("lang")(0)
              val langName = language
              val wordList = user.getWordList.filter(_.language == language).map(_.word).distinct.map(word => (word, word))

              Quizlet.createSet(token, s"$langName words from Ayamel", wordList, language.substring(0,2)).map(url => {
                Redirect(routes.WordLists.view()).flashing("success" -> ("Word list created. <a href=\"" + url + "\">View it now</a>."))
              })
            })
          }
        }

  }
}
