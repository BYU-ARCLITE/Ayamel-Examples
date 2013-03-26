package models

import anorm.{NotAssigned, ~, Pk}
import dataAccess.sqlTraits.{SQLSelectable, SQLDeletable, SQLSavable}
import anorm.SqlParser._
import service.TimeTools

/**
 * This links a resource object (in a resource library) to this system
 * @param id The id of this link in the DB
 * @param resourceId The id of the resource
 */
case class Content(id: Pk[Long], name: String, contentType: Symbol, thumbnail: String, resourceId: String,
                   dateAdded: String = TimeTools.now, visibility: Int = 2, shareability: Int = 3)
  extends SQLSavable with SQLDeletable {

  /**
   * Saves this content link to the DB
   * @return The optionally updated content
   */
  def save: Content = {
    if (id.isDefined) {
      update(Content.tableName, 'id -> id, 'name -> name, 'contentType -> contentType.name, 'thumbnail -> thumbnail,
        'resourceId -> resourceId, 'dateAdded -> dateAdded, 'visibility -> visibility, 'shareability -> shareability)
      this
    } else {
      val id = insert(Content.tableName, 'name -> name, 'contentType -> contentType.name, 'thumbnail -> thumbnail,
        'resourceId -> resourceId, 'dateAdded -> dateAdded, 'visibility -> visibility, 'shareability -> shareability)
      this.copy(id)
    }
  }

  /**
   * Deletes the content from the DB, but not from the resource library
   */
  def delete() {
    // Delete the content from courses
    ContentListing.listByContent(this).foreach(_.delete())

    // Delete ownership
    ContentOwnership.findByContent(this).delete()

    // Delete the content
    delete(Content.tableName, id)
  }

  /**
   * Visibility has four levels:
   * 1. Private - Only the owner can see this.
   * 2. Tightly Restricted - The owner and courses he/she add this to can see this.
   * 3. Loosely Restricted - The owner, teachers, and courses they add this to can see this.
   * 4. Public - Everybody can see this.
   * @param user The user to be checked
   * @return Visible or not
   */
  def isVisibleBy(user: User): Boolean = {
    // Always true if the user is an admin or the owner
    if (user.role == User.roles.admin || user.getContent.contains(this))
      true
    else
      // Check the visibility attribute of the content object
      visibility match {
        case 2 => user.getEnrollment.flatMap(_.getContent).contains(this)
        case 3 => user.role == User.roles.teacher || user.getEnrollment.flatMap(_.getContent).contains(this)
        case 4 => true
        case _ => false
      }
  }

  /**
   * Shareability has three levels:
   * 1. Not sharable
   * 2. Sharable by me only.
   * 3. Sharable by anybody who can see this.
   * @param user The user to be checked
   * @return Shareable or not
   */
  def isShareableBy(user: User): Boolean = {
    shareability match {
      case 1 => false
      case 2 => user.getContent.contains(this)
      case 3 => isVisibleBy(user)
    }
  }

  /**
   * Checks if the user is authorized to edit this content. Owners and admins can edit.
   * @param user The to check
   * @return Can edit or not
   */
  def isEditableBy(user: User): Boolean = user.role == User.roles.admin || user.getContent.contains(this)


}

object Content extends SQLSelectable[Content] {
  val tableName = "content"

  val simple = {
    get[Pk[Long]](tableName + ".id") ~
      get[String](tableName + ".name") ~
      get[String](tableName + ".contentType") ~
      get[String](tableName + ".thumbnail") ~
      get[String](tableName + ".resourceId") ~
      get[String](tableName + ".dateAdded") ~
      get[Int](tableName + ".visibility") ~
      get[Int](tableName + ".shareability") map {
      case id ~ name ~ contentType ~ thumbnail ~ resourceId ~ dateAdded ~ visibility ~ shareability =>
        Content(id, name, Symbol(contentType), thumbnail, resourceId, dateAdded, visibility, shareability)
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