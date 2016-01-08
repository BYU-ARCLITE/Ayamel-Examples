package models

import anorm._
import anorm.SqlParser._
import dataAccess.sqlTraits._
import play.api.Logger
import play.api.db.DB
import play.api.Play.current

/**
 * This represents content posted to a course
 * @param id The id of this ownership
 * @param courseId The id of the course
 * @param contentId The id of the content
 */
case class ContentListing(id: Option[Long], courseId: Long, contentId: Long) extends SQLSavable with SQLDeletable {

  /**
   * Saves the content listing to the DB
   * @return The possibly updated content listing
   */
  def save: ContentListing = {
    if (id.isDefined) {
      update(ContentListing.tableName, 'id -> id.get, 'courseId -> courseId, 'contentId -> contentId)
      this
    } else {
      val id = insert(ContentListing.tableName, 'courseId -> courseId, 'contentId -> contentId)
      this.copy(id)
    }
  }

  /**
   * Deletes the content listing from the DB
   */
  def delete() {
    delete(ContentListing.tableName, id)
  }

}

object ContentListing extends SQLSelectable[ContentListing] {
  val tableName = "contentListing"

  val simple = {
    get[Option[Long]](tableName + ".id") ~
      get[Long](tableName + ".courseId") ~
      get[Long](tableName + ".contentId") map {
      case id ~ courseId ~ contentId => ContentListing(id, courseId, contentId)
    }
  }

  /**
   * Search the DB for content listing with the given id.
   * @param id The id of the content listing.
   * @return If a content listing was found, then Some[ContentListing], otherwise None
   */
  def findById(id: Long): Option[ContentListing] = findById(ContentListing.tableName, id, simple)

  /**
   * Gets all content listing in the DB
   * @return The list of content listing
   */
  def list: List[ContentListing] = list(ContentListing.tableName, simple)

  /**
   * Lists the content listing pertaining to a certain course
   * @param course The course whose content we want
   * @return The list of content listings
   */
  def listByCourse(course: Course): List[ContentListing] =
    DB.withConnection { implicit connection =>
	  try {
        SQL"select * from $tableName where courseId = {id}"
          .on('id -> course.id.get).as(simple *)
	  } catch {
	    case e: Exception =>
		  Logger.debug("Failed in ContentListing.scala / listByCourse")
		  Logger.debug(e.getMessage())
		  List[ContentListing]()
	  }
    }

  /**
   * Lists the content listing pertaining to a certain content object
   * @param content The content object the listings will be for
   * @return The list of content listings
   */
  def listByContent(content: Content): List[ContentListing] =
    DB.withConnection { implicit connection =>
	  try {
        SQL"select * from $tableName where contentId = {id}"
          .on('id -> content.id.get).as(simple *)
	  } catch {
	    case e: Exception =>
		  Logger.debug("Failed in ContentListing.scala / listByContent")
		  Logger.debug(e.getMessage())
		  List[ContentListing]()
	  }
    }

  /**
   * Gets all content belonging to a certain course
   * @param course The course where the content is posted
   * @return The list of content
   */
  def listClassContent(course: Course): List[Content] =
    DB.withConnection { implicit connection =>
	  try {
        SQL"""select * from ${Content.tableName} join $tableName
		  on ${Content.tableName}.id = ${tableName}.contentId
		  where ${tableName}.courseId = ${course.id.get}"""
          .as(Content.simple *)
	  } catch {
	    case e: Exception =>
		  Logger.debug("Failed in ContentListing.scala / listClassContent")
		  Logger.debug(e.getMessage())
		  List[Content]()
	  }
    }
}