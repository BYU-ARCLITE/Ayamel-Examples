package models

import anorm._
import dataAccess.sqlTraits.{SQLSelectable, SQLDeletable, SQLSavable}
import anorm.SqlParser._

/**
 * Account Links are used to merge account
 * @param id The ID used in the DB
 * @param userIds The list of User IDs that are merged
 * @param primaryAccount The ID of the User that is to be the primary account
 */
case class AccountLink(id: Option[Long], userIds: Set[Long], primaryAccount: Long) extends SQLSavable with SQLDeletable {

  /**
   * Saves the account link to the DB
   * @return The possibly updated account link
   */
  def save: AccountLink = {
    if (id.isDefined) {
      update(AccountLink.tableName, 'id -> id.get, 'userIds -> userIds.mkString(","), 'primaryAccount -> primaryAccount)
      this
    } else {
      val id = insert(AccountLink.tableName, 'userIds -> userIds.mkString(","), 'primaryAccount -> primaryAccount)
      this.copy(id)
    }
  }

  /**
   * Deletes the account link from the DB
   */
  def delete() {
    delete(AccountLink.tableName, id)
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
   * Adds a user to this account link
   * @param user The user to add
   * @return The updated account link
   */
  def addUser(user: User): AccountLink = copy(userIds = userIds + user.id.get)

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

  /**
   * A caching mechanism to reduce the number of DB calls made
   */
  object cache {
    var users: Option[Set[User]] = None

    def getUsers = {
      if (users.isEmpty)
        users = Some(userIds.map(id => User.findById(id)).collect { case Some(user) => user })
      users.getOrElse(Set.empty[User])
    }
  }

  /**
   * @return All the users associated with this account link
   */
  def getUsers: Set[User] = cache.getUsers

  /**
   * @return The primary user of this account link
   */
  def getPrimaryUser: Option[User] = cache.getUsers.find(_.id.get == primaryAccount)

}

object AccountLink extends SQLSelectable[AccountLink] {
  val tableName = "accountLink"

  val simple = {
    get[Option[Long]](tableName + ".id") ~
      get[String](tableName + ".userIds") ~
      get[Long](tableName + ".primaryAccount") map {
      case id ~ userIds ~ primaryAccount => {
        val _userIds = if (userIds.isEmpty) Set[Long]() else userIds.split(",").map(_.toLong).toSet
        AccountLink(id, _userIds, primaryAccount)
      }
    }
  }

  /**
   * Search the DB for a user with the given id.
   * @param id The id of the user.
   * @return If a user was found, then Some[AccountLink], otherwise None
   */
  def findById(id: Long): Option[AccountLink] = findById(AccountLink.tableName, id, simple)

  /**
   * Gets all users in the DB
   * @return The list of users
   */
  def list: List[AccountLink] = list(AccountLink.tableName, simple)

}