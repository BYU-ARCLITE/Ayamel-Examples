package models

import anorm._
import anorm.SqlParser._
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
    DB.withConnection {
      implicit connection =>
        SQL(s"select permission from $tableName where courseId = {cid} and userId = {uid}")
          .on('cid -> course.id.get, 'uid -> user.id.get)
          .as(get[String](tableName + ".permission") *)
    }

  private def permissionExists(course: Course, user: User, permission: String)(implicit connection: Connection): Boolean = {
    val result = SQL(s"select 1 from $tableName where courseId = {cid} and userId = {uid} and permission = {permission}")
      .on('cid -> course.id.get, 'uid -> user.id.get, 'permission -> permission)
      .fold(0) { (c, _) => c + 1 } // fold SqlResult
      .fold(_ => 0, c => c) // fold Either
    result > 0
  }

  def userHasPermission(course: Course, user: User, permission: String): Boolean =
    DB.withConnection {
      implicit connection =>
        permissionExists(course, user, permission)
    }

  def addUserPermission(course: Course, user: User, permission: String) = {
    DB.withConnection {
      implicit connection =>
        if (!permissionExists(course, user, permission)) {
          SQL(s"insert into $tableName (courseId, userId, permission) values ({cid}, {uid}, {permission})")
            .on('cid -> course.id.get, 'uid -> user.id.get, 'permission -> permission).executeUpdate()
        }
    }
  }

  /**
   * remove a permission from a user
   */
  def removeUserPermission(course: Course, user: User, permission: String) = {
    DB.withConnection {
      implicit connection =>
        SQL(s"delete from $tableName where courseId = {cid} and userId = {uid} and permission = {permission}")
          .on('cid -> course.id.get, 'uid -> user.id.get, 'permission -> permission).executeUpdate()
    }
  }

  /**
   * Removes all the permissions a user has for a course
   */
  def removeAllUserPermissions(course: Course, user: User) = {
    DB.withConnection {
      implicit connection =>
        SQL(s"delete from $tableName where courseId = {cid} and userId = {uid}")
          .on('cid -> course.id.get, 'uid -> user.id.get).executeUpdate()
    }
  }

  def getDescription(permission: String) = desc_map.get(permission).getOrElse("")

}