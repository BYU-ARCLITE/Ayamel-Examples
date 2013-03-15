package models

import anorm.{NotAssigned, ~, Pk}
import sqlTraits.{SQLSelectable, SQLDeletable, SQLSavable}
import anorm.SqlParser._
import play.api.Logger

/**
 * A course. Students and teachers are members. Content and announcements can be posted here.
 * @param id The id of the course
 * @param name The name of the course
 * @param startDate When the course become functional
 * @param endDate When the course ceases to be functional
 * @param lmsKey A key for connecting with LMSs
 */
case class Course(id: Pk[Long], name: String, startDate: String, endDate: String, lmsKey: String)
  extends SQLSavable with SQLDeletable {

  /**
   * Saves the course to the DB
   * @return The possibly updated course
   */
  def save: Course = {
    if (id.isDefined) {
      update(Course.tableName, 'id -> id, 'name -> name, 'startDate -> startDate, 'endDate -> endDate,
        'lmsKey -> lmsKey)
      this
    } else {
      val id = insert(Course.tableName, 'name -> name, 'startDate -> startDate, 'endDate -> endDate, 'lmsKey -> lmsKey)
      this.copy(id)
    }
  }

  /**
   * Deletes the course from the DB
   */
  def delete() {
    delete(Course.tableName, id)
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
  def getContent: List[Content] = ContentListing.listClassContent(this)

  /**
   * Post content to the course
   * @param content The content to be posted
   * @return The content listing
   */
  def addContent(content: Content): ContentListing = ContentListing(NotAssigned, this.id.get, content.id.get).save

  /**
   * Remove content from the course
   * @param content The content to be removed
   * @return The course
   */
  def removeContent(content: Content): Course = {
    val listing = ContentListing.listByCourse(this).filter(_.contentId == content.id.get)

    // Check the number or results
    if (listing.size == 1)
    // One membership. So delete it
      listing(0).delete()
    else
    // We didn't get exactly one listing so don't do anything, but warn
      Logger.warn("Multiple (or zero) content lists for content #" + content.id.get + " in course #" + id.get)

    this
  }
}

object Course extends SQLSelectable[Course] {
  val tableName = "course"

  val simple = {
    get[Pk[Long]](tableName + ".id") ~
      get[String](tableName + ".name") ~
      get[String](tableName + ".startDate") ~
      get[String](tableName + ".endDate") ~
      get[String](tableName + ".lmsKey") map {
      case id~name~startDate~endDate~lmsKey => Course(id, name, startDate, endDate, lmsKey)
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