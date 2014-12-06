package models

import dataAccess.sqlTraits.{SQLSelectable, SQLDeletable, SQLSavable}
import anorm.{~, Pk}
import anorm.SqlParser._
import play.api.db.DB
import play.api.Play.current

/**
 * Represents the membership of a user in a course
 * @param id The id of the membership
 * @param userId The id of the user that is enrolled
 * @param courseId The id of the course in which the user is enrolled
 * @param teacher Is the user a teacher?
 */
case class CourseMembership(id: Pk[Long], userId: Long, courseId: Long, teacher: Boolean) extends SQLSavable with SQLDeletable {

  /**
   * Saves the course membership to the DB
   * @return The possibly modified course membership
   */
  def save: CourseMembership = {
    if (id.isDefined) {
      update(CourseMembership.tableName, 'id -> id, 'userId -> userId, 'courseId -> courseId, 'teacher -> teacher)
      this
    } else {
      val id = insert(CourseMembership.tableName, 'userId -> userId, 'courseId -> courseId, 'teacher -> teacher)
      this.copy(id)
    }
  }

  /**
   * Deletes the course membership from the DB
   */
  def delete() {
    val cid = this.courseId
    val uid = this.userId
    DB.withConnection {
      implicit connection =>
        anorm.SQL("delete from coursePermissions where courseId = {cid} and userId = {uid}")
          .on('cid -> cid, 'uid -> uid).execute()
    }
    delete(CourseMembership.tableName, id)
  }

}

object CourseMembership extends SQLSelectable[CourseMembership] {
  val tableName = "courseMembership"

  val simple = {
    get[Pk[Long]](tableName + ".id") ~
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
    DB.withConnection {
      implicit connection =>
        anorm.SQL("select * from " + tableName + " where userId = {id}").on('id -> user.id).as(simple *)
    }

  /**
   * Lists the membership pertaining to a certain course
   * @param user The course for whom the membership will be
   * @return The list of course membership
   */
  def listByCourse(course: Course): List[CourseMembership] =
    DB.withConnection {
      implicit connection =>
        anorm.SQL("select * from " + tableName + " where courseId = {id}").on('id -> course.id).as(simple *)
    }

  /**
   * Finds all courses that a certain user is enrolled in
   * @param user The user for whom the course list will be
   * @return The list of courses
   */
  def listUsersClasses(user: User): List[Course] = {
    DB.withConnection {
      implicit connection =>
        anorm.SQL("select * from " + Course.tableName + " join " + tableName + " on " + Course.tableName + ".id = " +
          tableName + ".courseId where " + tableName + ".userId = {id}").on('id -> user.id).as(Course.simple *)
    }
  }

  /**
   * Finds all courses that a certain user is teaching
   * @param user The user for whom the course list will be
   * @return The list of courses
   */
  def listTeacherClasses(user: User): List[Course] = {
    DB.withConnection {
      implicit connection =>
        anorm.SQL("select * from " + Course.tableName + " join " + tableName + " on " + Course.tableName + ".id = " +
          tableName + ".courseId where " + tableName + ".userId = {id} and " + tableName + ".teacher = true")
          .on('id -> user.id).as(Course.simple *)
    }
  }

  /**
   * Finds all students or teachers who are enrolled in a certain course
   * @param course The course in which the users are enrolled
   * @param teacher Get teachers instead of students?
   * @return The list of users
   */
  def listClassMembers(course: Course, teacher: Boolean): List[User] = {
    DB.withConnection {
      implicit connection =>
        anorm.SQL("select * from " + User.tableName + " join " + tableName + " on " + User.tableName + ".id = " +
          tableName + ".userId where " + tableName + ".courseId = {id} and " + tableName + ".teacher = {teacher}")
          .on('id -> course.id, 'teacher -> teacher).as(User.simple *)
    }
  }

  /**
   * Lists all course membership
   * @return The list of course memberships
   */
  def list: List[CourseMembership] = list(tableName, simple)
}
