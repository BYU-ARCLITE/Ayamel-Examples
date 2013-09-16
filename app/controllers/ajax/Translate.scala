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
 * AJAX controller for translating.
 * Translating via the ARCLITE dictionaries is done entirely in JS because there are no keys/credentials to keep secret.
 */
object Translate extends Controller {

  // The word reference API key
  val wordReferenceKey = Play.configuration.getString("translation.wordReference.key").get
  val googleKey = Play.configuration.getString("translation.google.key").get

  /**
   * Endpoint for translating via Google
   * @param src The source language
   * @param dest The destination language
   * @param text The text to translate
   */
  def translateGoogle(src: String, dest: String, text: String) = Action {
    request =>
      Async {
        WS.url("https://www.googleapis.com/language/translate/v2")
          .withQueryString("source" -> src, "target" -> dest, "q" -> text, "key" -> googleKey).get().map( result => {
            val translation = (result.json \ "data" \ "translations")(0) \ "translatedText"
            Ok(Json.obj("translation" -> translation))
          })
      }
  }

  /**
   * Endpoint for translating via WordReference
   * @param src The source language
   * @param dest The destination language
   * @param text The text to translate
   */
  def translateWordReference(src: String, dest: String, text: String) = Action {
    request =>
      val url = "http://api.wordreference.com/0.8/" + wordReferenceKey + "/json/" + src + dest + "/" + text
      Async {
        WS.url(url).get().map(result => Ok(result.json))
      }
  }

}
