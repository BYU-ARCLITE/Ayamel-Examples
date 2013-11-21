package models

import anorm.{NotAssigned, ~, Pk}
import dataAccess.sqlTraits.{SQLSelectable, SQLDeletable, SQLSavable}
import anorm.SqlParser._
import play.api.db.DB
import service.TimeTools
import play.api.Play.current

/**
 * Created with IntelliJ IDEA.
 * User: camman3d
 * Date: 3/21/13
 * Time: 3:48 PM
 * To change this template use File | Settings | File Templates.
 */
case class Announcement(id: Pk[Long], courseId: Long, userId: Long, timeMade: String, content: String)
  extends SQLSavable with SQLDeletable {

  /**
   * Saves the announcement to the DB
   * @return The possibly updated announcement
   */
  def save: Announcement = {
    if (id.isDefined) {
      update(Announcement.tableName, 'id -> id, 'courseId -> courseId, 'userId -> userId, 'timeMade -> timeMade,
        'content -> content)
      this
    } else {
      val id = insert(Announcement.tableName, 'courseId -> courseId, 'userId -> userId, 'timeMade -> timeMade,
        'content -> content)
      this.copy(id)
    }
  }

  /**
   * Deletes the announcement from the DB
   */
  def delete() {
    delete(Announcement.tableName, id)
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
   * Gets the user that made this announcement
   * @return The announcer
   */
  def getUser: Option[User] = cache.getUser
}

object Announcement extends SQLSelectable[Announcement] {
  val tableName = "announcement"

  val simple = {
    get[Pk[Long]](tableName + ".id") ~
      get[Long](tableName + ".courseId") ~
      get[Long](tableName + ".userId") ~
      get[String](tableName + ".timeMade") ~
      get[String](tableName + ".content") map {
      case id~courseId~userId~timeMade~content => Announcement(id, courseId, userId, timeMade, content)
    }
  }

  /**
   * Search the DB for a announcement with the given id.
   * @param id The id of the announcement.
   * @return If a announcement was found, then Some[Announcement], otherwise None
   */
  def findById(id: Long): Option[Announcement] = findById(Announcement.tableName, id, simple)

  /**
   * Create an announcement
   * @param course The course where the announcement is to be made
   * @param user The user who is making the announcement
   * @param content The content of the announcement
   * @return The newly created announcement
   */
  def create(course: Course, user: User, content: String): Announcement =
    Announcement(NotAssigned, course.id.get, user.id.get, TimeTools.now(), content).save

  /**
   * Gets all announcements in the DB
   * @return The list of announcements
   */
  def list: List[Announcement] = list(Announcement.tableName, simple)

  /**
   * Lists all announcements made in a certain course
   * @param course The course for which the announcements will be listed.
   * @return The list of announcements
   */
  def listByCourse(course: Course): List[Announcement] =
    DB.withConnection {
      implicit connection =>
        anorm.SQL("select * from " + tableName + " where courseId = {id}").on('id -> course.id).as(simple *)
    }

  /**
   * Lists all announcements made by a certain user
   * @param user The user for which the announcements will be listed.
   * @return The list of announcements
   */
  def listByUser(user: User): List[Announcement] =
    DB.withConnection {
      implicit connection =>
        anorm.SQL("select * from " + tableName + " where userId = {id}").on('id -> user.id).as(simple *)
    }

  /**
   * Create a announcement from fixture data
   * @param data Fixture data
   * @return The announcement
   */
  def fromFixture(data: (Long, Long, String, String)): Announcement =
    Announcement(NotAssigned, data._1, data._2, data._3, data._4)
}