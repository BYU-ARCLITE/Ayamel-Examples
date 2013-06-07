package models

import anorm.{NotAssigned, ~, Pk}
import dataAccess.sqlTraits.{SQLSelectable, SQLDeletable, SQLSavable}
import anorm.SqlParser._
import play.api.Logger
import service.{TimeTools, HashTools}
import util.Random
import play.api.db.DB
import play.api.Play.current

/**
 * A course. Students and teachers are members. Content and announcements can be posted here.
 * @param id The id of the course
 * @param name The name of the course
 * @param startDate When the course become functional
 * @param endDate When the course ceases to be functional
 * @param lmsKey A key for connecting with LMSs
 */
case class Course(id: Pk[Long], name: String, startDate: String, endDate: String, enrollment: Symbol = 'closed,
                  lmsKey: String = HashTools.md5Hex(Random.nextString(32))) extends SQLSavable with SQLDeletable {

  /**
   * Saves the course to the DB
   * @return The possibly updated course
   */
  def save: Course = {
    if (id.isDefined) {
      update(Course.tableName, 'id -> id, 'name -> name, 'startDate -> startDate, 'endDate -> endDate,
        'enrollment -> enrollment.name, 'lmsKey -> lmsKey)
      this
    } else {
      val id = insert(Course.tableName, 'name -> name, 'startDate -> startDate, 'endDate -> endDate,
        'enrollment -> enrollment.name, 'lmsKey -> lmsKey)
      this.copy(id)
    }
  }

  /**
   * Deletes the course from the DB
   */
  def delete() {
    delete(Course.tableName, id)
  }

  //                  _   _
  //        /\       | | (_)
  //       /  \   ___| |_ _  ___  _ __  ___
  //      / /\ \ / __| __| |/ _ \| '_ \/ __|
  //     / ____ \ (__| |_| | (_) | | | \__ \
  //    /_/    \_\___|\__|_|\___/|_| |_|___/
  //
  //   ______ ______ ______ ______ ______ ______ ______ ______ ______
  // |______|______|______|______|______|______|______|______|______|
  //

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

  /**
   * Makes an announcement to this course
   * @param user The user making the announcement
   * @param message The content of the announcement
   * @return The saved announcement
   */
  def makeAnnouncement(user: User, message: String): Announcement =
    Announcement(NotAssigned, this.id.get, user.id.get, TimeTools.now(), message).save

  //       _____      _   _
  //      / ____|    | | | |
  //     | |  __  ___| |_| |_ ___ _ __ ___
  //     | | |_ |/ _ \ __| __/ _ \ '__/ __|
  //     | |__| |  __/ |_| ||  __/ |  \__ \
  //      \_____|\___|\__|\__\___|_|  |___/
  //
  //   ______ ______ ______ ______ ______ ______ ______ ______ ______
  // |______|______|______|______|______|______|______|______|______|
  //

  val cacheTarget = this
  object cache {
    var students: Option[List[User]] = None

    def getStudents = {
      if (students.isEmpty)
        students = Some(CourseMembership.listClassMembers(cacheTarget, teacher = false))
      students.get
    }

    var teachers: Option[List[User]] = None

    def getTeachers = {
      if (teachers.isEmpty)
        teachers = Some(CourseMembership.listClassMembers(cacheTarget, teacher = true))
      teachers.get
    }

    var content: Option[List[Content]] = None

    def getContent = {
      if (content.isEmpty)
        content = Some(ContentListing.listClassContent(cacheTarget))
      content.get
    }

    var announcements: Option[List[Announcement]] = None

    def getAnnouncements = {
      if (announcements.isEmpty)
        announcements = Some(Announcement.listByCourse(cacheTarget))
      announcements.get
    }
  }

  /**
   * Get the enrolled students
   * @return The list of users who are students
   */
  def getStudents: List[User] = cache.getStudents

  /**
   * Get the enrolled teachers
   * @return The list of users who are teachers
   */
  def getTeachers: List[User] = cache.getTeachers

  /**
   * Get all the members (teachers and students)
   * @return The list of all members
   */
  def getMembers: List[User] = getTeachers ++ getStudents

  /**
   * Get content posted to this course
   * @return The list of content
   */
  def getContent: List[Content] = cache.getContent

  /**
   * Get the list of announcement for this course
   * @return The list of announcements
   */
  def getAnnouncements: List[Announcement] = cache.getAnnouncements

  /**
   * Get the list of announcement for this course, ordered by date
   * @return The list of announcements
   */
  def getSortedAnnouncements: List[Announcement] = cache.getAnnouncements
    .sortWith((a1, a2) => TimeTools.dateToTimestamp(a1.timeMade) > TimeTools.dateToTimestamp(a2.timeMade))

  /**
   * Get the list of requests by other users to join this course
   * @return The add course request list
   */
  def getRequests: List[AddCourseRequest] = AddCourseRequest.listByCourse(this)
}

object Course extends SQLSelectable[Course] {
  val tableName = "course"

  val simple = {
    get[Pk[Long]](tableName + ".id") ~
      get[String](tableName + ".name") ~
      get[String](tableName + ".startDate") ~
      get[String](tableName + ".endDate") ~
      get[String](tableName + ".enrollment") ~
      get[String](tableName + ".lmsKey") map {
      case id~name~startDate~endDate~enrollment~lmsKey => Course(id, name, startDate, endDate, Symbol(enrollment), lmsKey)
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
  def fromFixture(data: (String, String, String, Symbol, String)): Course =
    Course(NotAssigned, data._1, data._2, data._3, data._4, data._5)

  /**
   * Search the names of courses
   * @param query The string to look for
   * @return The list of courses that match
   */
  def search(query: String): List[Course] =
    DB.withConnection {
      implicit connection =>
        val sqlQuery = "%" + query + "%"
        anorm.SQL("SELECT * from " + tableName + " where name like {query}").on('query -> sqlQuery).as(simple *)
    }
}