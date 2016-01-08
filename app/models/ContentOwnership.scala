package models

import anorm._
import anorm.SqlParser._
import java.sql.SQLException
import dataAccess.sqlTraits._
import play.api.Logger
import play.api.db.DB
import play.api.Play.current

/**
 * This represents content ownership information
 * @param id The id of this ownership
 * @param userId The id of the owner
 * @param contentId The id of the content
 */
case class ContentOwnership(id: Option[Long], userId: Long, contentId: Long) extends SQLSavable with SQLDeletable {

  /**
   * Saves the content ownership to the DB
   * @return The possibly updated content ownership
   */
  def save =
    if(id.isDefined) {
	  update(ContentOwnership.tableName, 'userId -> userId, 'contentId -> contentId)
	  this
	} else {
	  val id = insert(ContentOwnership.tableName, 'userId -> userId, 'contentId -> contentId)
	  this.copy(id)
    }

  /**
   * Deletes the content ownership from the DB
   */
  def delete() {
    delete(ContentOwnership.tableName)
  }

}

object ContentOwnership extends SQLSelectable[ContentOwnership] {
  val tableName = "contentOwnership"

  val simple = {
    get[Option[Long]](tableName + ".id") ~
      get[Long](tableName + ".userId") ~
      get[Long](tableName + ".contentId") map {
      case id ~ userId ~ contentId => ContentOwnership(id, userId, contentId)
    }
  }

  /**
   * Search the DB for content ownership with the given id.
   * @param id The id of the content ownership.
   * @return If a content ownership was found, then Some[ContentOwnership], otherwise None
   */
  def findById(id: Long): Option[ContentOwnership] = findById(id, simple)

  /**
   * Gets all content ownership in the DB
   * @return The list of content ownership
   */
  def list: List[ContentOwnership] = list(simple)

  /**
   * Gets the ownership for a particular object (there should only be one)
   * @param content The content object the ownership is for
   * @return The content ownership
   */
  def findByContent(content: Content): ContentOwnership =
    findByCol("contentId", content.id, simple).get

  /**
   * Gets all content ownerships for a user
   * @param user The user who owns the content
   * @return The list of content ownerships
   */
  def listByUser(user: User): List[ContentOwnership] =
    listByCol("userId", user.id, simple)
    
  /**
   * Gets all content belonging to a certain user
   * @param user The user who owns the content
   * @return The list of content
   */
  def listUserContent(user: User): List[Content] =
    DB.withConnection { implicit connection =>
      try {
        SQL(
		  s"""
		  select * from ${Content.tableName} join $tableName
          on ${Content.tableName}.id = ${tableName}.contentId
          where ${tableName}.userId = {id}
		  """
        )
		  .on('id -> user.id)
		  .as(Content.simple *)
      } catch {
        case e: SQLException =>
          Logger.debug("Failed in ContentOwnership / listUserContent")
          Logger.debug(e.getMessage())
          List[Content]()
      }
    }
}
