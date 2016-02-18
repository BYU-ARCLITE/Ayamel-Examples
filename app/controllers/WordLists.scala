package controllers

import scala.concurrent._
import ExecutionContext.Implicits.global
import play.api.mvc.Controller
import play.api.Play.current
import controllers.authentication.Authentication
import service.HashTools
import dataAccess.Quizlet
import scala.concurrent.ExecutionContext
import ExecutionContext.Implicits.global
import models.WordListEntry
import java.text.Normalizer
import play.api.libs.json.Json

/**
 * Controller dealing with word lists
 */
object WordLists extends Controller {

  val isHTTPS = current.configuration.getBoolean("HTTPS").getOrElse(false)

  /*
   * Recognize and fix certain diacritics that can cause issues in sql
   */
  def normalize(str: String) = {
    Normalizer.normalize(str, Normalizer.Form.NFC)
  }

  /**
   * Adds a word (or text) to a word list. For AJAX calls
   */
  def add = Authentication.authenticatedAction(parse.urlFormEncoded) {
    implicit request =>
      implicit user =>
        user.addWord(normalize(request.body("word")(0)), request.body("srcLang")(0), request.body("destLang")(0))
        Future(Ok)
  }

  /**
   * View the user's word list (in html)
   */
  def view = Authentication.authenticatedAction() {
    implicit request =>
      implicit user =>
        val wordList = user.getWordList
        Future(Ok(views.html.words.view(wordList)))
  }

  /**
   * View the user's word list (in JSON)
   */
  def viewJSON = Authentication.authenticatedAction() {
    implicit request =>
      implicit user =>
        val wordList = user.getWordList
        .map{word => Json.obj("id"-> word.id, "word"-> word.word, "srcLang"-> word.srcLang, "destLang"-> word.destLang)}
        // Future(Ok(views.html.words.view(wordList)))
        Future(Ok(Json.obj("wordList"-> wordList)))
  }

  /**
   * Delete a word from the word list
   * @param id The ID of the word list entry
   */
  def deleteWord(id: Long) = Authentication.authenticatedAction() {
    implicit request =>
      implicit user =>
        WordListEntry.findById(id).map(_.delete())
        Future { 
          Redirect(routes.WordLists.view())
            .flashing("info" -> "Word deleted.")
        }
  }

  /**
   * HTML Sanitization
   * Tuples is html that is likely to occur (these should be the only possibilities for our dictionary api)
   * clean replaces the string's html tags with quizlet text format
   * @param str The string that needs sanitizing
   */
  val tuples = List("<b>" -> "*", "</b>" -> "*", "<br>" -> "\\\n", "<i>" -> "", "</i>" -> "")
  def clean(str: String) = tuples.foldLeft( str )( (s,t) => s.replaceAll(t._1,t._2) )

  /**
   * Exports the word list to quizlet
   */
  def export = Authentication.authenticatedAction(parse.multipartFormData) {
    implicit request =>
      user =>
        val token = request.body.dataParts("token")(0)
        val title = request.body.dataParts("title")(0)
        val termLanguage = request.body.dataParts("lang_terms")(0)
        val definitionLanguage = request.body.dataParts("lang_definitions")(0)
        val terms = request.body.dataParts("terms[]").zip(request.body.dataParts("definitions[]")).toList
        val termsMinusAudio : List[(String,String)] = for ( term <- terms ) yield { (clean(term._1), clean(term._2.split(", <audio")(0)))}

        Quizlet.createSet(token, title, termsMinusAudio, termLanguage, definitionLanguage).map(url => Ok(url))
  }

  /**
   * Starts the oauth authorization process with Quizlet
   */
  def authorize = Authentication.authenticatedAction() {
    implicit request =>
      user =>
        val data = Map(
          "response_type" -> Seq("code"),
          "client_id" -> Seq(Quizlet.clientId),
          "scope" -> Seq("write_set"),
          "state" -> Seq(HashTools.md5Hex(request.session.toString)),
          "redirect_uri" -> Seq(routes.WordLists.authorizeCallback().absoluteURL(isHTTPS))
        )
        Future(Redirect("https://quizlet.com/authorize/", data))
  }

  /**
   * Finished the oauth authorization process with Quizlet
   */
  def authorizeCallback = Authentication.authenticatedAction() {
    implicit request =>
      user =>
      // Check for an error
        if (request.queryString.contains("error")) {
          Future(Ok(views.html.words.authCode(success = false, "")))
        } else {

          // Check the state
          // val state = HashTools.md5Hex(request.session.toString)

          // Get the auth token
          val code = request.queryString("code")(0)

          // Get the access token from the code
          Quizlet.getAuthToken(code).map { token =>
            Ok(views.html.words.authCode(success = true, token))
          }
        }
  }
}
