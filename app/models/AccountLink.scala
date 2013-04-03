package models

import anorm.{NotAssigned, ~, Pk}
import dataAccess.sqlTraits.{SQLSelectable, SQLDeletable, SQLSavable}
import anorm.SqlParser._

/**
 * Created with IntelliJ IDEA.
 * AccountLink: camman3d
 * Date: 3/28/13
 * Time: 10:00 AM
 * To change this template use File | Settings | File Templates.
 */
case class AccountLink(id: Pk[Long], userIds: Set[Long], primaryAccount: Long) extends SQLSavable with SQLDeletable {

  /**
   * Saves the user to the DB
   * @return The possibly updated user
   */
  def save: AccountLink = {
    if (id.isDefined) {
      update(AccountLink.tableName, 'id -> id, 'userIds -> userIds.mkString(","), 'primaryAccount -> primaryAccount)
      this
    } else {
      val id = insert(AccountLink.tableName, 'userIds -> userIds.mkString(","), 'primaryAccount -> primaryAccount)
      this.copy(id)
    }
  }

  /**
   * Deletes the user from the DB
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

  object cache {
    var users: Option[Set[User]] = None

    def getUsers = {
      if (users.isEmpty)
        users = Some(userIds.map(id => User.findById(id).get))
      users.get
    }
  }

  def getUsers: Set[User] = cache.getUsers

  def getPrimaryUser: User = cache.getUsers.find(_.id.get == primaryAccount).get



}

object AccountLink extends SQLSelectable[AccountLink] {
  val tableName = "accountLink"

  val simple = {
    get[Pk[Long]](tableName + ".id") ~
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