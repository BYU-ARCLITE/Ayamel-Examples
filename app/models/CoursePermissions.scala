package models

import anorm._
import anorm.SqlParser._
import java.sql.SQLException
import play.api.Logger
import play.api.db.DB
import play.api.Play.current
import java.sql.Connection

object CoursePermissions {
  val tableName = "coursePermissions"

  val desc_map = Map(
    "teacher" -> "Course Admin",
    "viewData" -> "View Student Data and Analytics",
    "editCourse" -> "Edit Course Information",
    "addContent" -> "Add Content to Course",
    "makeAnnouncement" -> "Make Course Announcements",
    "removeContent" -> "Remove Content from Course",
    "addStudent" -> "Add Students to Course",
    "removeStudent" -> "Remove Students from Course",
    "addTeacher" -> "Add Teachers to Course",
    "removeTeacher" -> "Remove Teachers from Course"
  )

  def permissionList = desc_map.keys.toList
  def descriptionList = desc_map.values.toList
  def descriptionMap = desc_map

  def listByUser(course: Course, user: User): List[String] =
    DB.withConnection { implicit connection =>
      try {
        SQL(s"select permission from $tableName where courseId = {cid} and userId = {uid}")
          .on('cid -> course.id.get, 'uid -> user.id.get)
          .as(get[String](tableName + ".permission") *)
      } catch {
        case e: SQLException =>
          Logger.debug("Failed in CoursePermissions.scala / listByUser")
          Logger.debug(e.getMessage())
          List[String]()
      }
    }

  private def permissionExists(course: Course, user: User, permission: String)(implicit connection: Connection): Boolean = {
    try {
      val result = SQL(s"select 1 from $tableName where courseId = {cid} and userId = {uid} and permission = {permission}")
        .on('cid -> course.id.get, 'uid -> user.id.get, 'permission -> permission)
        .fold(0) { (c, _) => c + 1 } // fold SqlResult
        .fold(_ => 0, c => c) // fold Either
      result > 0
    } catch {
      case e: SQLException =>
        Logger.debug("Failed in CoursePermissions.scala / permissionExists")
        Logger.debug(e.getMessage())
        false
    }
  }

  def userHasPermission(course: Course, user: User, permission: String): Boolean =
    DB.withConnection { implicit connection =>
      permissionExists(course, user, permission)
    }

  def addUserPermission(course: Course, user: User, permission: String) =
    DB.withConnection { implicit connection =>
      if (!permissionExists(course, user, permission)) {
        try {
          SQL(s"insert into $tableName (courseId, userId, permission) values ({cid}, {uid}, {permission})")
            .on('cid -> course.id.get, 'uid -> user.id.get, 'permission -> permission)
            .executeUpdate()
        } catch {
          case e: SQLException =>
            Logger.debug("Failed in CoursePermissions.scala / addUserPermissions")
            Logger.debug(e.getMessage())
        }
      }
    }

  /**
   * remove a permission from a user
   */
  def removeUserPermission(course: Course, user: User, permission: String) = {
    DB.withConnection { implicit connection =>
      try {
        SQL(s"delete from $tableName where courseId = {cid} and userId = {uid} and permission = {permission}")
          .on('cid -> course.id.get, 'uid -> user.id.get, 'permission -> permission)
          .executeUpdate()
      } catch {
        case e: SQLException =>
          Logger.debug("Failed in CoursePermissions.scala / removeUserPermission")
          Logger.debug(e.getMessage())
      }
    }
  }

  /**
   * Removes all the permissions a user has for a course
   */
  def removeAllUserPermissions(course: Course, user: User) = {
    DB.withConnection { implicit connection =>
      try {
        SQL(s"delete from $tableName where courseId = {cid} and userId = {uid}")
          .on('cid -> course.id.get, 'uid -> user.id)
		  .executeUpdate()
      } catch {
        case e: SQLException =>
          Logger.debug("Failed in CoursePermissions.scala / removeAllUserPermissions")
          Logger.debug(e.getMessage())
      }
    }
  }

  def getDescription(permission: String) = desc_map.get(permission).getOrElse("")

}