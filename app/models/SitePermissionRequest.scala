package models

import anorm._
import anorm.SqlParser._
import dataAccess.sqlTraits._
import play.api.Logger
import play.api.db.DB
import play.api.Play.current

/**
 * Represents a user's request for permissions
 * @param id The id of the request
 * @param userId The id of the user making the request
 * @param reason The reason why the user wants a permission
 */
case class SitePermissionRequest(id: Option[Long], userId: Long, permission: String, reason: String) extends SQLSavable with SQLDeletable {

  /**
   * Saves the request to the DB
   * @return The possibly modified request
   */
  def save =
    if (id.isDefined) {
      update(SitePermissionRequest.tableName, 'id -> id.get, 'userId -> userId, 'permission -> permission, 'reason -> reason)
      this
    } else {
      val id = insert(SitePermissionRequest.tableName, 'userId -> userId, 'permission -> permission, 'reason -> reason)
      this.copy(id)
    }

  /**
   * Deletes the request from the DB
   */
  def delete() {
    delete(SitePermissionRequest.tableName)
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

  def approve() {
    getUser.foreach { user =>
        user.addSitePermission(this.permission)
        user.sendNotification("Your request for " + getDescription + " permission has been approved.")
    }
    delete()
  }

  def deny() {
    getUser.foreach(_.sendNotification("Sorry, but your request for " + getDescription + " permission has been denied."))
    delete()
  }

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

  object cache {
    var user: Option[User] = None

    def getUser = {
      if (user.isEmpty)
        user = User.findById(userId)
      user
    }
  }

  /**
   * Returns the user make this request
   * @return The user
   */
  def getUser: Option[User] = cache.getUser
  
  def getDescription: String = SitePermissions.getDescription(this.permission)

}

object SitePermissionRequest extends SQLSelectable[SitePermissionRequest] {
  val tableName = "sitePermissionRequest"

  val simple = {
    get[Option[Long]](tableName + ".id") ~
      get[Long](tableName + ".userId") ~
      get[String](tableName + ".permission") ~
      get[String](tableName + ".reason") map {
      case id~userId~permission~reason => SitePermissionRequest(id, userId, permission, reason)
    }
  }

  /**
   * Finds a request by the id
   * @param id The id of the request
   * @return If a request was found, then Some[SitePermissionRequest], otherwise None
   */
  def findById(id: Long): Option[SitePermissionRequest] = findById(id, simple)

  /**
   * Finds requests by the requesting user
   * @param user The user who made the request
   * @return a possibly-empty list of permission requests
   */
  def listByUser(user: User): List[SitePermissionRequest] =
    listByCol("userId", user.id, simple)

  /**
   * Finds a particular request by the requesting user
   * @param user The user who made the request
   * @param permission The permission requested
   * @return an Some[SitePermissionRequest] if one was found
   */
  def findByUser(user: User, permission: String): Option[SitePermissionRequest] =
    findByCol("userId", user.id, simple)

  /**
   * Lists all requests
   * @return The list of requests
   */
  def list: List[SitePermissionRequest] = list(simple)
}
