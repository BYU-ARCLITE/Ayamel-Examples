package controllers.ajax

import play.api.mvc.{Action, Controller}
import play.api.libs.json.{JsString, JsObject, Json}
import service.SerializationTools
import scala.concurrent.{ExecutionContext, Future, Await}
import scala.concurrent.duration._
import ExecutionContext.Implicits.global
import play.api.libs.ws.WS
import play.api.cache.Cache
import play.api.Play
import Play.current

/**
 * AJAX controller for translating
 */
object Translate extends Controller {

  val wordReferenceKey = Play.configuration.getString("translation.wordReference.key").get

  object googleTranslate {
    val email = Play.configuration.getString("translation.google.email").get
    val password = Play.configuration.getString("translation.google.password").get
    val source = Play.configuration.getString("translation.google.source").get
  }

  /**
   * Authenticates with Google
   * @return The auth code
   */
  def authenticateGoogle: Future[String] = {
    val postData = "Email=" + googleTranslate.email + "&Passwd=" + googleTranslate.password + "&service=rs2&source=" +
      googleTranslate.source
    WS.url("https://www.google.com/accounts/ClientLogin")
      .withHeaders("Content-Type" -> "application/x-www-form-urlencoded")
      .post(postData).map(r => r.body.lines.find(_.startsWith("Auth=")).get.substring(5))
  }

  /**
   * Attempts to get the Google auth code from the cache. If not there, it authenticates.
   * @return The auth code
   */
  def getGoogleAuth: String = {
    Cache.getAs[String]("googleAuth").getOrElse({
      val code = Await.result(authenticateGoogle, 30 seconds)
      Cache.set("googleAuth", code, 1800)
      code
    })
  }

  object translationServices {

    def google(src: String, dest: String, text: String): Future[String] = {
      val auth = getGoogleAuth
      WS.url("http://translate.google.com/researchapi/translate")
        .withQueryString("sl" -> src, "tl" -> dest, "q" -> text)
        .withHeaders("Authorization" -> ("GoogleLogin auth=" + auth)).get().map(_.xml)
        .map(xmlResponse => (xmlResponse \ "entry" \ "translation").text)
    }
  }

  def translateGoogle(src: String, dest: String, text: String) = Action {
    request =>
      Async {
        translationServices.google(src, dest, text).map(translation => Ok(Json.obj("translation" -> translation)))
      }
  }

  def translateWordReference(src: String, dest: String, text: String) = Action {
    request =>
      val url = "http://api.wordreference.com/0.8/" + wordReferenceKey + "/json/" + src + dest + "/" + text
      Async {
        WS.url(url).get().map(result => Ok(result.json))
      }
  }

}
