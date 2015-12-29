package models

import anorm._
import anorm.SqlParser._
import play.api.db.DB
import play.api.Play.current
import java.sql.Connection

object SitePermissions {
  val tableName = "sitePermissions"

  val desc_map = Map(
    "admin" -> "Administrator",
    "createCourse" -> "Create Course",
    "createContent" -> "Create Content",
    "viewRestricted" -> "View Restricted Content",
    "joinCourse" -> "Join Courses",
    "requestPermission" -> "Request New Permissions"
  )

  def permissionList = desc_map.keys.toList
  def descriptionList = desc_map.values.toList
  def descriptionMap = desc_map

  def listByUser(user: User): List[String] =
    DB.withConnection {
      implicit connection =>
        SQL(s"select permission from $tableName where userId = {uid}")
          .on('uid -> user.id.get)
          .as(get[String](s"${tableName}.permission") *)
    }

  private def permissionExists(user: User, permission: String)(implicit connection: Connection): Boolean = {
    val result = SQL(s"select 1 from $tableName where userId = {uid} and permission = {permission}")
      .on('uid -> user.id.get, 'permission -> permission)
      .fold(0) { (c, _) => c + 1 } // fold SqlResult
      .fold(_ => 0, c => c) // fold Either
    result > 0
  }

  def userHasPermission(user: User, permission: String): Boolean =
    DB.withConnection {
      implicit connection =>
        permissionExists(user, permission)
    }

  def addUserPermission(user: User, permission: String) {
    DB.withConnection {
      implicit connection =>
        if (!permissionExists(user, permission)) {
          SQL(s"insert into $tableName (userId, permission) values ({uid}, {permission})")
            .on('uid -> user.id.get, 'permission -> permission).executeUpdate()
        }
    }
  }

  /**
   * deletes the permission from sitePermissions if it exists
   * @param user User whose permission is to be removed
   * @param permission String name of the permission to search and delete
   */
  def removeUserPermission(user: User, permission: String) {
    DB.withConnection {
      implicit connection =>
        SQL(s"delete from $tableName where userId = {uid} and permission = {permission}")
          .on('uid -> user.id.get, 'permission -> permission).executeUpdate()
    }
  }

  /**
   * removes all permissions for a user
   * @param user User whose permissions are to be removed
   */
  def removeAllUserPermissions(user: User) {
    DB.withConnection {
      implicit connection =>
        SQL(s"delete from $tableName where userId = {uid}")
          .on('uid -> user.id.get).executeUpdate()
    }
  }
    
  def getDescription(permission: String) = desc_map.get(permission).getOrElse("")
  
  val roles = Map(
    'guest -> List(),
    'student -> List("requestPermission", "createContent", "joinCourse"),
    'teacher -> List("requestPermission", "createContent", "joinCourse", "createCourse", "viewRestricted"),
    'admin -> List("admin")
  )
  
  def assignRole(user: User, role: Symbol) {
    roles(role).foreach { p =>
      addUserPermission(user, p)
    }
  }

}