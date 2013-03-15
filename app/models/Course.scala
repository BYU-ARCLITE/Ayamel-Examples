package models

import anorm.{NotAssigned, ~, Pk}
import sqlTraits.{SQLSelectable, SQLDeletable, SQLSavable}
import anorm.SqlParser._

/**
 * A course. Students and teachers are members. Content and announcements can be posted here.
 * @param id The id of the course
 * @param name The name of the course
 * @param startDate When the course become functional
 * @param endDate When the course ceases to be functional
 * @param settings A JSON formatted string of settings
 */
case class Course(id: Pk[Long], name: String, startDate: String, endDate: String, settings: String)
  extends SQLSavable with SQLDeletable {

  /**
   * Saves the course to the DB
   * @return The possibly updated course
   */
  def save: Course = {
    if (id.isDefined) {
      update(Course.tableName, 'id -> id, 'name -> name, 'startDate -> startDate, 'endDate -> endDate,
        'settings -> settings)
      this
    } else {
      val id = insert(Course.tableName, 'name -> name, 'startDate -> startDate, 'endDate -> endDate,
        'settings -> settings)
      this.copy(id)
    }
  }

  /**
   * Deletes the course from the DB
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
  def getStudents: List[User] = CourseMembership.listClassMembers(this, teacher = false)

  /**
   * Get the enrolled teachers
   * @return The list of users who are teachers
   */
  def getTeachers: List[User] = CourseMembership.listClassMembers(this, teacher = true)

  /**
   * Get content posted to this course
   * @return The list of content
   */
  def getContent: List[Content] = ContentListing.listByClass(this)

  /**
   * Get announcements for this course
   * @return The list of messages (announcements)
   */
  def getAnnouncements: List[Message] = Message.listClassAnnouncements(this)

  /**
   * Get requests to join this course
   * @return The list of messages (requests)
   */
  def getRequests: List[Message] = Message.listClassRequests(this)

  /**
   * Make an announcement to the course
   * @param user The user making the announcement
   * @param message The content of the announcement
   * @return The new message
   */
  def makeAnnouncement(user: User, message: String): Message = Message.sendAnnouncement(user, this, message)

  /**
   * Post content to the course
   * @param content The content to be posted
   * @return The content listing
   */
  def addContent(content: Content): ContentListing = ContentListing(NotAssigned, this.id.get, content.id.get).save
}

object Course extends SQLSelectable[Course] {
  val tableName = "course"

  val simple = {
    get[Pk[Long]](tableName + ".id") ~
      get[String](tableName + ".name") ~
      get[String](tableName + ".startDate") ~
      get[String](tableName + ".endDate") ~
      get[String](tableName + ".settings") map {
      case id~name~startDate~endDate~settings => Course(id, name, startDate, endDate, settings)
    }
  }

  /**
   * Find a course with the given id
   * @param id The id of the course
   * @return If a course was found, then Some[Course], otherwise None
   */
  def findById(id: Long): Option[Course] = findById(tableName, id, simple)

  /**
   * Gets all the courses in the DB
   * @return The list of courses
   */
  def list: List[Course] = list(tableName, simple)

  /**
   * Create a course from fixture data
   * @param data Fixture data
   * @return The user
   */
  def fromFixture(data: (String, String, String, String)): Course =
    Course(NotAssigned, data._1, data._2, data._3, data._4)
}