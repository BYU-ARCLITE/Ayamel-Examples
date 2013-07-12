package controllers

import play.api.mvc.Controller
import controllers.authentication.Authentication

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

  def export = TODO
}
