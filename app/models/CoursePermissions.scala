package models

import anorm._
import anorm.SqlParser._
import play.api.db.DB
import play.api.Play.current

object CoursePermissions {
  val tableName = "coursePermissions"

  val desc_map = Map(
    "teacher" -> "View Student Data and Analytics",
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
        anorm.SQL("select permission from " + tableName + " where courseId = {cid} and userId = {uid}")
          .on('cid -> course.id.get, 'uid -> user.id.get)
          .as(get[String](tableName + ".permission") *)
    }

  def userHasPermission(course: Course, user: User, permission: String): Boolean =
    DB.withConnection {
      implicit connection =>
        !(anorm.SQL("select 1 from " + tableName + " where courseId = {cid} and userId = {uid} and permission = {permission}")
            .on('cid -> course.id.get, 'uid -> user.id.get, 'permission -> permission).list.isEmpty)
    }

  def addUserPermission(course: Course, user: User, permission: String) {
    DB.withConnection {
      implicit connection =>
        if (anorm.SQL("select 1 from " + tableName + " where courseId = {cid} and userId = {uid} and permission = {permission}")
            .on('cid -> course.id.get, 'uid -> user.id.get, 'permission -> permission).list.isEmpty) {
          anorm.SQL("insert into " + tableName + " (courseId, userId, permission) values ({cid}, {uid}, {permission})")
            .on('cid -> course.id.get, 'uid -> user.id.get, 'permission -> permission).executeUpdate()
        }
    }
  }

  def getDescription(permission: String) = desc_map.get(permission).getOrElse("")

}