package dataAccess

import play.api.Play
import play.api.libs.ws.WS
import Play.current
import scala.concurrent.{ExecutionContext, Future}
import ExecutionContext.Implicits.global
import service.HTMLConversion

/**
 * Controller dealing with Quizlet
 */
object Quizlet {

  // Quizlet API access keys and IDs loaded from the configuration file
  val clientId = Play.configuration.getString("quizlet.clientId").get
  val secretKey = Play.configuration.getString("quizlet.secretKey").get
  val auth = Play.configuration.getString("quizlet.auth").get

  // Common strings and URLs
  val urlEncoded = "application/x-www-form-urlencoded; charset=UTF-8"
  val authUrl = "https://api.quizlet.com/oauth/token"
  val createSetUrl = "https://api.quizlet.com/2.0/sets"

  /**
   * Given a code from the oauth callback, requests an access token
   * @param code The auth code
   * @return The access token wrapped in a Future
   */
  def getAuthToken(code: String): Future[String] = {
    val authorization = "Basic " + auth
    WS.url(authUrl)
      .withHeaders("Authorization" -> authorization, "Content-Type" -> urlEncoded)
      .post(s"grant_type=authorization_code&code=$code")
      .map(r => (r.json \ "access_token").as[String])
  }

  /**
   * Creates a set on Quizlet
   * @param token The access token
   * @param title The title of the set
   * @param terms The terms and definitions
   * @param termLanguage The terms language
   * @param definitionLanguage The definitions languge
   * @return The URL of the newly created set wrapped in a Future
   */
  def createSet(token: String, title: String, terms: List[(String, String)], termLanguage: String,
                definitionLanguage: String): Future[String] = {

    // Create the form body
    var body = s"title=$title&lang_terms=$termLanguage&lang_definitions=$definitionLanguage"
    for (term <- terms)
      body += "&terms[]=" + term._1 + "&definitions[]=" + term._2

    // Some definitions have HTML entities that use '&', which breaks some of the definition
    body = HTMLConversion.convertEntities(body.toString)

    // Make the request
    WS.url(createSetUrl)
      .withHeaders("Authorization" -> s"Bearer $token", "Content-Type" -> urlEncoded)
      .post(body).map(r => (r.json \ "url").as[String])
  }

}
