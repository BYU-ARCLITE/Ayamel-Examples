package models

import anorm.{~, Pk}
import sqlTraits.{SQLSelectable, SQLDeletable, SQLSavable}
import anorm.SqlParser._

/**
 * This links a resource object (in a resource library) to this system
 * @param id The id of this link in the DB
 * @param resourceId The id of the resource
 */
case class Content(id: Pk[Long], resourceId: String) extends SQLSavable with SQLDeletable {

  /**
   * Saves this content link to the DB
   * @return The optionally updated content
   */
  def save: Content = {
    if (id.isDefined) {
      update(Content.tableName, 'id -> id, 'resourceId -> resourceId)
      this
    } else {
      val id = insert(Content.tableName, 'resourceId -> resourceId)
      this.copy(id)
    }
  }

  /**
   * Deletes the content from the DB, but not from the resource library
   */
  def delete() {
    delete(Content.tableName, id)
  }

}

object Content extends SQLSelectable[Content] {
  val tableName = "content"

  val simple = {
    get[Pk[Long]](tableName + ".id") ~
      get[String](tableName + ".resourceId") map {
      case id~resourceId => Content(id, resourceId)
    }
  }

  /**
   * Finds a content by the given id
   * @param id The id of the content link
   * @return If a content link was found, then Some[Content], otherwise None
   */
  def findById(id: Long): Option[Content] = findById(tableName, id, simple)

  /**
   * Gets all the content in the DB
   * @return The list of content
   */
  def list: List[Content] = list(tableName, simple)
}