package models

import anorm._
import anorm.SqlParser._
import play.api.Logger
import dataAccess.sqlTraits._
import play.api.db.DB
import play.api.Play.current

/**
 * Represents the membership of a user in a course
 * @param id The id of the membership
 * @param userId The id of the user that is enrolled
 * @param courseId The id of the course in which the user is enrolled
 * @param teacher Is the user a teacher?
 */
case class CourseMembership(id: Option[Long], userId: Long, courseId: Long, teacher: Boolean) extends SQLSavable with SQLDeletable {

  /**
   * Saves the course membership to the DB
   * @return The possibly modified course membership
   */
  def save: CourseMembership = {
    if (id.isDefined) {
      update(CourseMembership.tableName, 'id -> id.get, 'userId -> userId, 'courseId -> courseId, 'teacher -> teacher)
      this
    } else {
      DB.withConnection { implicit connection =>
        try {
          // won't add users to the course if they are already enrolled in it
          // Don't use userIsEnrolled method because that takes objects, not IDs
          val result = SQL(s"select 1 from ${CourseMembership.tableName} where userId = {uid} and courseId = {cid}")
            .on('uid -> userId, 'cid -> courseId)
            .fold(0) { (c, _) => c + 1 } // fold SqlResult
            .fold(_ => 0, c => c) // fold Either
          if (result == 0) {
            val id = insert(CourseMembership.tableName, 'userId -> userId, 'courseId -> courseId, 'teacher -> teacher)
            this.copy(id)
          } else {
            this
          }
        } catch {
          case e: Exception =>
            Logger.debug("Failed in CourseMembership.scala / save")
            Logger.debug(e.getMessage())
            throw e
        }
      }
    }
  }

  /**
   * Deletes the course membership from the DB
   */
  def delete() {
    val cid = this.courseId
    val uid = this.userId
    DB.withConnection { implicit connection =>
      try {
        SQL("delete from coursePermissions where courseId = {cid} and userId = {uid}")
          .on('cid -> cid, 'uid -> uid).execute()
      } catch {
        case e: Exception =>
          Logger.debug("Failed in CourseMembership.scala / delete")
          Logger.debug(e.getMessage())
      }
    }
    delete(CourseMembership.tableName, id)
  }

}

object CourseMembership extends SQLSelectable[CourseMembership] {
  val tableName = "courseMembership"

  val simple = {
    get[Option[Long]](tableName + ".id") ~
      get[Long](tableName + ".userId") ~
      get[Long](tableName + ".courseId") ~
      get[Boolean](tableName + ".teacher") map {
      case id~userId~courseId~teacher => CourseMembership(id, userId, courseId, teacher)
    }
  }

  /**
   * Finds a course membership by the id
   * @param id The id of the membership
   * @return If a course membership was found, then Some[CourseMembership], otherwise None
   */
  def findById(id: Long): Option[CourseMembership] = findById(tableName, id, simple)

  /**
   * Lists the membership pertaining to a certain user
   * @param user The user for whom the membership will be
   * @return The list of course membership
   */
  def listByUser(user: User): List[CourseMembership] =
    DB.withConnection { implicit connection =>
      try {
        SQL"select * from $tableName where userId = {id}"
          .on('id -> user.id.get).as(simple *)
      } catch {
        case e: Exception =>
          Logger.debug("Failed in CourseMembership.scala / userIsEnrolled")
          Logger.debug(e.getMessage())
          List[CourseMembership]()
      }
    }

  /**
   * Lists the membership pertaining to a certain course
   * @param user The course for whom the membership will be
   * @return The list of course membership
   */
  def listByCourse(course: Course): List[CourseMembership] =
    DB.withConnection { implicit connection =>
      try {
        SQL"select * from $tableName where courseId = {id}"
          .on('id -> course.id.get).as(simple *)
      } catch {
        case e: Exception =>
          Logger.debug("Failed in CourseMembership.scala / listByCourse")
          Logger.debug(e.getMessage())
          List[CourseMembership]()
      }
    }

  /**
   * Finds all courses that a certain user is enrolled in
   * @param user The user for whom the course list will be
   * @return The list of courses
   */
  def listUsersClasses(user: User): List[Course] = {
    DB.withConnection { implicit connection =>
      try {
        SQL"""
          select * from ${Course.tableName} join $tableName
          on ${Course.tableName}.id = ${tableName}.courseId
          where ${tableName}.userId = {id}
          order by name asc"""
          .on('id -> user.id.get).as(Course.simple *)
      } catch {
        case e: Exception =>
          Logger.debug("Failed in CourseMembership.scala / listUsersClasses")
          Logger.debug(e.getMessage())
          List[Course]()
      }
    }
  }

  /**
   * Finds all courses that a certain user is teaching
   * @param user The user for whom the course list will be
   * @return The list of courses
   */
  def listTeacherClasses(user: User): List[Course] = {
    DB.withConnection { implicit connection =>
      try {
        SQL"""
          select * from ${Course.tableName} join $tableName
          on ${Course.tableName}.id = ${tableName}.courseId
          where ${tableName}.userId = {id} and ${tableName}.teacher = true
          order by name asc"""
          .on('id -> user.id.get).as(Course.simple *)
      } catch {
        case e: Exception =>
          Logger.debug("Failed in CourseMembership.scala / listTeacherClassesd")
          Logger.debug(e.getMessage())
          List[Course]()
      }
    }
  }

  /**
   * Finds all students or teachers who are enrolled in a certain course
   * @param course The course in which the users are enrolled
   * @param teacher Get teachers instead of students?
   * @return The list of users
   */
  def listClassMembers(course: Course, teacher: Boolean): List[User] = {
    DB.withConnection { implicit connection =>
      try {
        SQL"""
          select * from ${User.tableName} join $tableName
          on ${User.tableName}.id = ${tableName}.userId
          where ${tableName}.courseId = {id} and ${tableName}.teacher = {teacher}
          order by name asc"""
          .on('id -> course.id.get, 'teacher -> teacher)
          .as(User.simple *)
      } catch {
        case e: Exception =>
          Logger.debug("Failed in CourseMembership.scala / listClassMembers")
          Logger.debug(e.getMessage())
          List[User]()
      }
    }
  }

  /**
   * Checks if a specific user is enrolled in a certain course
   * @param user The user who's enrollment is being checked
   * @param course The course in which the user may be enrolled
   * @return Whether or not they're enrolled
   */
  def userIsEnrolled(user: User, course: Course): Boolean =
    DB.withConnection { implicit connection =>
      try {
        val result = SQL"select 1 from $tableName where userId = {uid} and courseId = {cid}"
          .on('uid -> user.id.get, 'cid -> course.id.get)
          .fold(0) { (c, _) => c + 1 } // fold SqlResult
          .fold(_ => 0, c => c) // fold Either
        result > 0
      } catch {
        case e: Exception =>
          Logger.debug("Failed in CourseMembership.scala / userIsEnrolled")
          Logger.debug(e.getMessage())
          false
      }
    }

  /**
   * Lists all course membership
   * @return The list of course memberships
   */
  def list: List[CourseMembership] = list(tableName, simple)
}
