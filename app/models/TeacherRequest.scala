package models

import anorm.{~, Pk}
import dataAccess.sqlTraits.{SQLSelectable, SQLDeletable, SQLSavable}
import anorm.SqlParser._
import play.api.db.DB
import play.api.Play.current

/**
 * Represents a user's request to be a teacher
 * @param id The id of the request
 * @param userId The id of the user making the request
 * @param reason The reason why the user wants to be a teacher
 */
case class TeacherRequest(id: Pk[Long], userId: Long, reason: String) extends SQLSavable with SQLDeletable {

  /**
   * Saves the teacher request to the DB
   * @return The possibly modified teacher request
   */
  def save: TeacherRequest = {
    if (id.isDefined) {
      update(TeacherRequest.tableName, 'id -> id, 'userId -> userId, 'reason -> reason)
      this
    } else {
      val id = insert(TeacherRequest.tableName, 'userId -> userId, 'reason -> reason)
      this.copy(id)
    }
  }

  /**
   * Deletes the teacher request from the DB
   */
  def delete() {
    delete(TeacherRequest.tableName, id)
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
    getUser.copy(role = User.roles.teacher).save.sendNotification("Your request for teacher status has been approved.")
    delete()
  }

  def deny() {
    getUser.sendNotification("Sorry, but your request for teacher status has been denied.")
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
      user.get
    }
  }

  /**
   * Returns the user make this request
   * @return The user
   */
  def getUser: User = cache.getUser

}


object TeacherRequest extends SQLSelectable[TeacherRequest] {
  val tableName = "teacherRequest"

  val simple = {
    get[Pk[Long]](tableName + ".id") ~
      get[Long](tableName + ".userId") ~
      get[String](tableName + ".reason") map {
      case id~userId~reason => TeacherRequest(id, userId, reason)
    }
  }

  /**
   * Finds a teacher request by the id
   * @param id The id of the membership
   * @return If a teacher request was found, then Some[TeacherRequest], otherwise None
   */
  def findById(id: Long): Option[TeacherRequest] = findById(tableName, id, simple)

  /**
   * Finds a teacher request by the requesting user
   * @param user The user who made the request
   * @return If a teacher request was found, then Some[TeacherRequest], otherwise None
   */
  def findByUser(user: User): Option[TeacherRequest] =
    DB.withConnection {
      implicit connection =>
        anorm.SQL("select * from " + tableName + " where userId = {id}").on('id -> user.id).as(simple.singleOpt)
    }

  /**
   * Lists all teacher requests
   * @return The list of teacher requests
   */
  def list: List[TeacherRequest] = list(tableName, simple)
}
