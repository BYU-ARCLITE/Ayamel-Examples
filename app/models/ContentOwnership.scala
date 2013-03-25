package models

import anorm.{~, Pk}
import dataAccess.sqlTraits.{SQLSelectable, SQLDeletable, SQLSavable}
import anorm.SqlParser._
import play.api.db.DB
import play.api.Play.current

/**
 * This represents content ownership information
 * @param id The id of this ownership
 * @param userId The id of the owner
 * @param contentId The id of the content
 */
case class ContentOwnership(id: Pk[Long], userId: Long, contentId: Long) extends SQLSavable with SQLDeletable {

  /**
   * Saves the content ownership to the DB
   * @return The possibly updated content ownership
   */
  def save: ContentOwnership = {
    if (id.isDefined) {
      update(ContentOwnership.tableName, 'id -> id, 'userId -> userId, 'contentId -> contentId)
      this
    } else {
      val id = insert(ContentOwnership.tableName, 'userId -> userId, 'contentId -> contentId)
      this.copy(id)
    }
  }

  /**
   * Deletes the content ownership from the DB
   */
  def delete() {
    delete(ContentOwnership.tableName, id)
  }

}

object ContentOwnership extends SQLSelectable[ContentOwnership] {
  val tableName = "contentOwnership"

  val simple = {
    get[Pk[Long]](tableName + ".id") ~
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
  def findById(id: Long): Option[ContentOwnership] = findById(ContentOwnership.tableName, id, simple)

  /**
   * Gets all content ownership in the DB
   * @return The list of content ownership
   */
  def list: List[ContentOwnership] = list(ContentOwnership.tableName, simple)

  /**
   * Gets the ownership for a particular object (there should only be one)
   * @param content The content object the ownership is for
   * @return The content ownership
   */
  def findByContent(content: Content): ContentOwnership =
    DB.withConnection {
      implicit connection =>
        anorm.SQL("select * from " + tableName + " where contentId = {id}").on('id -> content.id).as(simple.single)
    }

  /**
   * Gets all content belonging to a certain user
   * @param user The user who owns the content
   * @return The list of content
   */
  def listUserContent(user: User): List[Content] =
    DB.withConnection {
      implicit connection =>
        anorm.SQL("select * from " + Content.tableName + " join " + tableName + " on " + Content.tableName + ".id = " +
          tableName + ".contentId where " + tableName + ".userId = {userId}").on('userId -> user.id)
          .as(Content.simple *)
    }
}
