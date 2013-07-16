package dataAccess

import play.api.{Logger, Play}
import Play.current
import scala.concurrent.{ExecutionContext, Future}
import ExecutionContext.Implicits.global
import play.api.libs.ws.WS

/**
 * Created with IntelliJ IDEA.
 * User: josh
 * Date: 7/13/13
 * Time: 12:14 PM
 * To change this template use File | Settings | File Templates.
 */
object Quizlet {

  val clientId = Play.configuration.getString("quizlet.clientId").get
  val secretKey = Play.configuration.getString("quizlet.secretKey").get
  val auth = Play.configuration.getString("quizlet.auth").get

  val authUrl = "https://api.quizlet.com/oauth/token"
  val urlEncoded = "application/x-www-form-urlencoded; charset=UTF-8"

  val createSetUrl = "https://api.quizlet.com/2.0/sets"

  def getAuthToken(code: String): Future[String] = {
    val authorization = "Basic " + auth
    WS.url(authUrl)
      .withHeaders("Authorization" -> authorization, "Content-Type" -> urlEncoded)
      .post(s"grant_type=authorization_code&code=$code")
      .map(r => (r.json \ "access_token").as[String])
  }

  def createSet(token: String, title: String, terms: List[(String, String)], termLanguage: String,
                definitionLanguage: String): Future[String] = {

    // Create the form body
    var body = s"title=$title&lang_terms=$termLanguage&lang_definitions=$definitionLanguage"
    for (term <- terms)
      body += "&terms[]=" + term._1 + "&definitions[]=" + term._2

    // Make the request
    WS.url(createSetUrl)
      .withHeaders("Authorization" -> s"Bearer $token", "Content-Type" -> urlEncoded)
      .post(body).map(r => (r.json \ "url").as[String])
  }

}
