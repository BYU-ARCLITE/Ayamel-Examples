package controllers

import play.api.mvc.{Action, Controller}
import play.api.libs.json.{JsString, JsObject, Json}
import service.SerializationTools

/**
 * Created with IntelliJ IDEA.
 * User: camman3d
 * Date: 4/5/13
 * Time: 1:51 PM
 * To change this template use File | Settings | File Templates.
 */
object AjaxUtil extends Controller {
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
}
