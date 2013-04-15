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
 * Date: 4/5/13
 * Time: 1:51 PM
 * To change this template use File | Settings | File Templates.
 */
object Util extends Controller {
  def serializeMap = Action(parse.urlFormEncoded) {
    request =>
      val json = Json.parse(request.body("map")(0)).as[JsObject]
      val map = Map() ++ json.fieldSet.toMap.mapValues(_.as[String])
      val encoded = SerializationTools.serializeMap(map)
      Ok(encoded)
  }

  def deserializeMap = Action(parse.urlFormEncoded) {
    request =>
      val encoded = request.body("data")(0)
      val map = SerializationTools.deserializeMap(encoded)
      val json = JsObject(map.mapValues(s => JsString(s)).toSeq)
      Ok(json)
  }

  def annotate(language: String, text: String) = Action {
    request =>

      // Select a random token
      val tokens = text.split("\\s+")
      val token = tokens(util.Random.nextInt(tokens.size))

      // Look it up in wikipedia
      Async {
        val url = "http://" + language + ".wikipedia.org/w/api.php?action=query&format=xml&titles=" + token
        WS.url(url).get().map(response => {
          val xml = response.xml

          // Does it exist?
          val pageId = (xml \ "query" \ "pages" \ "page")(0).attribute("pageid")
          if (pageId.isDefined) {

            // Yes, so give a link to it
            val title = (xml \ "query" \ "pages" \ "page")(0).attribute("title").get
            Ok(Json.obj("success" -> true, "token" -> token, "url" -> ("http://" + language + ".wikipedia.7val.com/wiki/" + title)))
          } else
            Ok(Json.obj("success" -> false))
        })
      }
  }

}
