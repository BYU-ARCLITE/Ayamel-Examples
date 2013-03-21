package models

import anorm.{NotAssigned, ~, Pk}
import dataAccess.sqlTraits.{SQLSelectable, SQLDeletable, SQLSavable}
import anorm.SqlParser._
import org.joda.time.format.ISODateTimeFormat
import org.joda.time.DateTime

/**
 * This links a resource object (in a resource library) to this system
 * @param id The id of this link in the DB
 * @param resourceId The id of the resource
 */
case class Content(id: Pk[Long], name: String, contentType: Symbol, thumbnail: String, resourceId: String,
                   dateAdded: String = ISODateTimeFormat.dateTime().print(new DateTime()))
  extends SQLSavable with SQLDeletable {

  /**
   * Saves this content link to the DB
   * @return The optionally updated content
   */
  def save: Content = {
    if (id.isDefined) {
      update(Content.tableName, 'id -> id, 'name -> name, 'contentType -> contentType.name, 'thumbnail -> thumbnail,
        'resourceId -> resourceId, 'dateAdded -> dateAdded)
      this
    } else {
      val id = insert(Content.tableName, 'name -> name, 'contentType -> contentType.name, 'thumbnail -> thumbnail,
        'resourceId -> resourceId, 'dateAdded -> dateAdded)
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
      get[String](tableName + ".name") ~
      get[String](tableName + ".contentType") ~
      get[String](tableName + ".thumbnail") ~
      get[String](tableName + ".resourceId") ~
      get[String](tableName + ".dateAdded") map {
      case id ~ name ~ contentType ~ thumbnail ~ resourceId ~ dateAdded =>
        Content(id, name, Symbol(contentType), thumbnail, resourceId, dateAdded)
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

  /**
   * Create a content from fixture data
   * @param data Fixture data
   * @return The content
   */
  def fromFixture(data: (String, Symbol, String, String)): Content =
    Content(NotAssigned, data._1, data._2, data._3, data._4)
}