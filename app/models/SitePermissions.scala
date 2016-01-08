package models

import anorm._
import anorm.SqlParser._
import java.sql.SQLException
import dataAccess.sqlTraits.SQLSelectable
import play.api.Logger
import play.api.db.DB
import play.api.Play.current
import java.sql.Connection

object SitePermissions extends SQLSelectable[String]  {
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
    listByCol("userId", user.id, get[String](tableName+".permission"))

  private def permissionExists(user: User, permission: String)(implicit connection: Connection): Boolean = {
    try {
      val result = SQL(s"select 1 from $tableName where userId = {uid} and permission = {permission}")
        .on('uid -> user.id, 'permission -> permission)
        .fold(0) { (c, _) => c + 1 } // fold SqlResult
        .fold(_ => 0, c => c) // fold Either
      result > 0
    } catch {
      case e: SQLException =>
        Logger.debug("Failed in SitePermissions.scala / permissionExists")
        Logger.debug(e.getMessage())
        false
    }
  }

  def userHasPermission(user: User, permission: String): Boolean =
    DB.withConnection { implicit connection =>
      permissionExists(user, permission)
    }

  def addUserPermission(user: User, permission: String) {
    DB.withConnection { implicit connection =>
      if (!permissionExists(user, permission)) {
        try {
          SQL(s"insert into $tableName (userId,permission) values ({uid},{permission})")
            .on('uid -> user.id, 'permission -> permission)
			.executeUpdate()
        } catch {
          case e: SQLException =>
            Logger.debug("Failed in SitePermissions.scala / addUserPermission")
            Logger.debug(e.getMessage())
        }
      }
    }
  }

  /**
   * deletes the permission from sitePermissions if it exists
   * @param user User whose permission is to be removed
   * @param permission String name of the permission to search and delete
   */
  def removeUserPermission(user: User, permission: String) {
    DB.withConnection { implicit connection =>
      try {
        SQL(s"delete from $tableName where userId = {uid} and permission = {permission}")
          .on('uid -> user.id.get, 'permission -> permission).executeUpdate()
      } catch {
        case e: SQLException =>
          Logger.debug("Failed in SitePermissions.scala / removeUserPermission")
          Logger.debug(e.getMessage())
      }
    }
  }

  /**
   * removes all permissions for a user
   * @param user User whose permissions are to be removed
   */
  def removeAllUserPermissions(user: User) {
    DB.withConnection { implicit connection =>
      try {
        SQL(s"delete from $tableName where userId = {uid}")
          .on('uid -> user.id.get).executeUpdate()
      } catch {
        case e: SQLException =>
          Logger.debug("Failed in SitePermissions.scala / removeAllUserPermissions")
          Logger.debug(e.getMessage())
      }
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