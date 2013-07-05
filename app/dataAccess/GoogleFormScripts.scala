package dataAccess

import scala.concurrent.{ExecutionContext, Future}
import ExecutionContext.Implicits.global
import play.api.libs.ws.{Response, WS}
import play.api.Play
import play.api.Play.current
import org.apache.http.client.utils.URLEncodedUtils
import org.apache.http.message.BasicNameValuePair
import collection.JavaConversions._
import models.Scoring
import anorm.NotAssigned

/**
 * Created with IntelliJ IDEA.
 * User: josh
 * Date: 7/5/13
 * Time: 11:00 AM
 * To change this template use File | Settings | File Templates.
 */
object GoogleFormScripts {

  val createFormScript = Play.configuration.getString("exercises.createFormScript").get
  val getResponseIndexScript = Play.configuration.getString("exercises.getResponseIndexScript").get
  val gradeFormScript = Play.configuration.getString("exercises.gradeFormScript").get

  /**
   * This is a method which runs a given Google App Script with specified parameters and returns the result
   * @param url The URL of the script to run
   * @param parameters A key/value map of query string parameters
   * @return The response
   */
  private def runScript(url: String, parameters: Map[String, String] = Map()): Future[Response] = {
    // Build the query string
    val queryString =
      if (parameters.isEmpty) "" else {
        val data = parameters.toList.map(data => new BasicNameValuePair(data._1, data._2))
        "?" + URLEncodedUtils.format(data, "UTF-8")
      }

    // Run the script
    WS.url(url + queryString).get()
  }

  /**
   * Creates a new Google Form
   * @param title The title of the new form
   * @param email An email to add as an author
   * @return The ID of the newly created form
   */
  def createForm(title: String, email: String): Future[String] =
    runScript(createFormScript, Map("title" -> title, "email" -> email))
      .map(response => (response.json \ "id").as[String])

  /**
   * Figures out the index of the next response for a given form
   * @param id The ID of the form
   * @return The index of the next response
   */
  def getResponseIndex(id: String): Future[Int] =
    runScript(getResponseIndexScript, Map("id" -> id)).map(response => {
      (response.json \ "responseIndex").as[Int]
    })

  /**
   * Grades the response at a particular index for a given form
   * @param id The ID of the form
   * @param index The index fo the response to grade
   * @return A scoring summary
   */
  def grade(id: String, index: Int): Future[Scoring] =
    runScript(gradeFormScript, Map("id" -> id, "index" -> index.toString)).map(response => {
      val json = response.json
      val score = (json \ "score").as[Double]
      val possible = (json \ "possible").as[Double]
      val results = (json \ "results").as[List[Double]]
      Scoring(NotAssigned, score, possible, results, 0, 0)
    })


}
