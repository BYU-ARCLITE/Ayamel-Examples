package models

import anorm.{NotAssigned, ~, Pk}
import sqlTraits.{SQLSelectable, SQLDeletable, SQLSavable}
import anorm.SqlParser._

/**
 * A class (course). Students and teachers are members. Content and announcements can be posted here.
 * @param id The id of the class
 * @param name The name of the class
 * @param startDate When the class become functional
 * @param endDate When the class ceases to be functional
 * @param settings A JSON formatted string of settings
 */
case class Class(id: Pk[Long], name: String, startDate: String, endDate: String, settings: String)
  extends SQLSavable with SQLDeletable {

  /**
   * Saves the class to the DB
   * @return The possibly updated class
   */
  def save: Class = {
    if (id.isDefined) {
      update(Class.tableName, 'id -> id, 'name -> name, 'startDate -> startDate, 'endDate -> endDate,
        'settings -> settings)
      this
    } else {
      val id = insert(Class.tableName, 'name -> name, 'startDate -> startDate, 'endDate -> endDate,
        'settings -> settings)
      this.copy(id)
    }
  }

  /**
   * Deletes the class from the DB
   */
  def delete() {
    delete(Content.tableName, id)
  }

  //      Logic
  // ===============

  /**
   * Get the enrolled students
   * @return The list of users who are students
   */
  def getStudents: List[User] = ClassMembership.listClassMembers(this, teacher = false)

  /**
   * Get the enrolled teachers
   * @return The list of users who are teachers
   */
  def getTeachers: List[User] = ClassMembership.listClassMembers(this, teacher = true)

  /**
   * Get content posted to this class
   * @return The list of content
   */
  def getContent: List[Content] = ContentListing.listByClass(this)

  /**
   * Get announcements for this class
   * @return The list of messages (announcements)
   */
  def getAnnouncements: List[Message] = Message.listClassAnnouncements(this)

  /**
   * Get requests to join this class
   * @return The list of messages (requests)
   */
  def getRequests: List[Message] = Message.listClassRequests(this)

  /**
   * Make an announcement to the class
   * @param user The user making the announcement
   * @param message The content of the announcement
   * @return This class (for chaining)
   */
  def makeAnnouncement(user: User, message: String): Class = {
    Message.sendAnnouncement(user, this, message)
    this
  }

  /**
   * Post content to the class
   * @param content The content to be posted
   * @return This class (for chaining)
   */
  def addContent(content: Content): Class = {
    ContentListing(NotAssigned, this.id.get, content.id.get).save
    this
  }
}

object Class extends SQLSelectable[Class] {
  val tableName = "class"

  val simple = {
    get[Pk[Long]](tableName + ".id") ~
      get[String](tableName + ".name") ~
      get[String](tableName + ".startDate") ~
      get[String](tableName + ".endDate") ~
      get[String](tableName + ".settings") map {
      case id~name~startDate~endDate~settings => Class(id, name, startDate, endDate, settings)
    }
  }

  /**
   * Find a class with the given id
   * @param id The id of the class
   * @return If a class was found, then Some[Class], otherwise None
   */
  def findById(id: Long): Option[Class] = findById(tableName, id, simple)

  /**
   * Gets all the classes in the DB
   * @return The list of classes
   */
  def list: List[Class] = list(tableName, simple)

  /**
   * Create a class from fixture data
   * @param data Fixture data
   * @return The user
   */
  def fromFixture(data: (String, String, String, String)): Class =
    Class(NotAssigned, data._1, data._2, data._3, data._4)
}