package controllers

import play.api.mvc.{Action, Controller}
import play.api.Play.current
import concurrent.{Await, ExecutionContext}
import concurrent.duration._
import ExecutionContext.Implicits.global
import play.api.libs.ws.WS
import play.api.cache.Cache
import play.api.libs.json.Json

/**
 * Created with IntelliJ IDEA.
 * User: camman3d
 * Date: 3/1/13
 * Time: 2:50 PM
 * To change this template use File | Settings | File Templates.
 */
object GoogleTranslate extends Controller {

  def authenticate(): String = {
    // Google creds
    val email = "arclitelab@gmail.com"
    val password = "cosmo1976"
    val source = "arclite-ayamel-1"

    // Get the google auth code
    Await.result(
      WS.url("https://www.google.com/accounts/ClientLogin")
        .withHeaders("Content-Type" -> "application/x-www-form-urlencoded")
        .post("Email="+email+"&Passwd="+password+"&service=rs2&source="+source).map(r => r.body.lines.find(_.startsWith("Auth=")).get.substring(5)),
      30 seconds
    )
  }

  def getGoogleAuth: String = {
    Cache.getAs[String]("googleAuth").getOrElse({
      val code = authenticate()
      Cache.set("googleAuth", code, 1800)
      code
    })
  }

  def translate(src: String, dest: String, text: String) = Action {
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

}
