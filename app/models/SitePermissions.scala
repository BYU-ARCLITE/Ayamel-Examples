package models

import anorm._
import anorm.SqlParser._
import play.api.db.DB
import play.api.Play.current

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
        anorm.SQL("select permission from " + tableName + " where userId = {uid}")
          .on('uid -> user.id.get)
          .as(get[String](tableName + ".permission") *)
    }

  def userHasPermission(user: User, permission: String): Boolean =
    DB.withConnection {
      implicit connection =>
        !(anorm.SQL("select 1 from " + tableName + " where userId = {uid} and permission = {permission}")
            .on('uid -> user.id.get, 'permission -> permission).list.isEmpty)
    }

  def addUserPermission(user: User, permission: String) = {
    DB.withConnection {
      implicit connection =>
        if (anorm.SQL("select 1 from " + tableName + " where userId = {uid} and permission = {permission}")
            .on('uid -> user.id.get, 'permission -> permission).list.isEmpty) {
          anorm.SQL("insert into " + tableName + " (userId, permission) values ({uid}, {permission})")
            .on('uid -> user.id.get, 'permission -> permission).executeUpdate()
        }
    }
  }

  /**
   * deletes the permission from sitePermissions if it exists
   * @param user User whose permission is to be removed
   * @param permission String name of the permission to search and delete
   */
  def removeUserPermission(user: User, permission: String) = {
    DB.withConnection {
      implicit connection =>
      if (anorm.SQL("select 1 from " + tableName + " where userId = {uid} and permission = {permission}")
          .on('uid -> user.id.get, 'permission -> permission).list.nonEmpty) {
        anorm.SQL("delete from " + tableName + " where userId = {uid} and permission = {permission}")
          .on('uid -> user.id.get, 'permission -> permission).executeUpdate()
      }
    }
  }

  /**
   * removes all permissions for a user
   * @param user User whose permissions are to be removed
   */
  def removeAllUserPermissions(user: User) = {
    DB.withConnection {
      implicit connection =>
        anorm.SQL("delete from " + tableName + " where userId = {uid}")
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
      user.addSitePermission(p)
    }
  }

}