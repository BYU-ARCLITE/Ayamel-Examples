package models

import anorm._
import anorm.SqlParser._
import dataAccess.sqlTraits._
import play.api.Logger
import play.api.db.DB
import service.TimeTools
import play.api.libs.json.Json
import play.api.Play.current

/**
 * Created with IntelliJ IDEA.
 * User: josh
 * Date: 7/5/13
 * Time: 1:56 PM
 * To change this template use File | Settings | File Templates.
 */
case class Scoring(id: Option[Long], score: Double, possible: Double, results: List[Double], userId: Long, contentId: Long,
                    graded: String = TimeTools.now()) extends SQLSavable with SQLDeletable {

  /**
   * Saves the scoring to the DB
   * @return The possibly modified scoring
   */
  def save =
    if (id.isDefined) {
      update(Scoring.tableName, 'id -> id.get, 'score -> score, 'possible -> possible, 'results -> results.mkString(","),
        'userId -> userId, 'contentId -> contentId, 'graded -> graded)
      this
    } else {
      val id = insert(Scoring.tableName, 'score -> score, 'possible -> possible, 'results -> results.mkString(","),
        'userId -> userId, 'contentId -> contentId, 'graded -> graded)
      this.copy(id)
    }

  /**
   * Deletes the scoring from the DB
   */
  def delete() {
    delete(Scoring.tableName)
  }

  def toJson = Json.obj(
    "id" -> id.get,
    "score" -> score,
    "possible" -> possible,
    "results" -> results,
    "graded" -> graded
  )

  def percent = math.floor(score / possible * 10000) / 100

}

object Scoring extends SQLSelectable[Scoring] {
  val tableName = "scoring"

  val simple = {
    get[Option[Long]](tableName + ".id") ~
    get[Double](tableName + ".score") ~
    get[Double](tableName + ".possible") ~
    get[String](tableName + ".results") ~
    get[Long](tableName + ".userId") ~
    get[Long](tableName + ".contentId") ~
    get[String](tableName + ".graded") map {
      case id ~ score ~ possible ~ results ~ userId ~ contentId ~ graded => Scoring(id, score, possible,
        results.split(",").map(_.toDouble).toList, userId, contentId, graded)
    }
  }

  /**
   * Finds a scoring by the id
   * @param id The id of the membership
   * @return If a scoring was found, then Some[Scoring], otherwise None
   */
  def findById(id: Long): Option[Scoring] = findById(id, simple)

  /**
   * Finds a scoring by the user
   * @param user The user who took the question set
   * @return If a scoring was found, then Some[Scoring], otherwise None
   */
  def listByUser(user: User): List[Scoring] =
    listByCol("userId", user.id, simple)

  /**
   * Finds a scoring by the content
   * @param content The content for which scorings were recorded
   * @return If a scoring was found, then Some[Scoring], otherwise None
   */
  def listByContent(content: Content): List[Scoring] =
    listByCol("contentId", content.id, simple)

  /**
   * Lists all scorings
   * @return The list of scorings
   */
  def list: List[Scoring] = list(simple)
}