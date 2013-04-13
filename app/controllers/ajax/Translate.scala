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
 * Created with IntelliJ IDEA.
 * User: camman3d
 * Date: 4/13/13
 * Time: 11:00 AM
 * To change this template use File | Settings | File Templates.
 */
object Translate extends Controller {

  val wordReferenceKey = Play.configuration.getString("translation.wordReference.key").get

  object googleTranslate {
    val email = Play.configuration.getString("translation.google.email").get
    val password = Play.configuration.getString("translation.google.password").get
    val source = Play.configuration.getString("translation.google.source").get
  }

  // Get the google auth code
  def authenticateGoogle: Future[String] = {
    val postData = "Email=" + googleTranslate.email + "&Passwd=" + googleTranslate.password + "&service=rs2&source=" +
      googleTranslate.source
    WS.url("https://www.google.com/accounts/ClientLogin")
      .withHeaders("Content-Type" -> "application/x-www-form-urlencoded")
      .post(postData).map(r => r.body.lines.find(_.startsWith("Auth=")).get.substring(5))
  }

  def getGoogleAuth: String = {
    Cache.getAs[String]("googleAuth").getOrElse({
      val code = Await.result(authenticateGoogle, 30 seconds)
      Cache.set("googleAuth", code, 1800)
      code
    })
  }

  def translateGoogle(src: String, dest: String, text: String) = Action {
    request =>
      val authCode = getGoogleAuth
      val xmlResponse = Await.result(
        WS.url("http://translate.google.com/researchapi/translate")
          .withQueryString("sl" -> src, "tl" -> dest, "q" -> text)
          .withHeaders("Authorization" -> ("GoogleLogin auth=" + authCode)).get().map(_.xml),
        30 seconds
      )
      val translation = (xmlResponse \ "entry" \ "translation").text
      Ok(Json.obj("translation" -> translation)).as("application/json")
  }

  def translateWordReference(src: String, dest: String, text: String) = Action {
    request =>
      val url = "http://api.wordreference.com/0.8/" + wordReferenceKey + "/json/" + src + dest + "/" + text
      Async {
        WS.url(url).get().map(result => Ok(result.json))
      }
  }

}
