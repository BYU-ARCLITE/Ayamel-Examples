package models

import anorm.{NotAssigned, ~, Pk}
import dataAccess.sqlTraits.{SQLDeletable, SQLSelectable, SQLSavable}
import anorm.SqlParser._
import play.api.db.DB
import play.api.Play.current
import play.api.Logger
import controllers.routes

/**
 * AddCourseRequest
 * @param id
 * @param userId id of the user
 * @param course
 *
 */

case class AddCourseRequest (id:Pk [Long], userId:Long, courseId:Long, message: String) extends SQLSavable with SQLDeletable {
  /**
   * Saves the content ownership to the DB
   * @return The possibly updated content ownership
   */
  def save: AddCourseRequest = {
    if (id.isDefined) {
      update(AddCourseRequest.tableName, 'id -> id, 'userId -> userId, 'courseId -> courseId, 'message -> message)
      this
    } else {
      val id = insert(AddCourseRequest.tableName, 'userId -> userId, 'courseId -> courseId, 'message -> message)
      this.copy(id)
    }
  }

  /**
   * Deletes the content ownership from the DB
   */
  def delete() {
    delete(AddCourseRequest.tableName, id)
  }
}

object AddCourseRequest extends SQLSelectable[AddCourseRequest] {
  val tableName = "addCourseRequest"

  val simple = {
    get[Pk[Long]](tableName + ".id") ~
      get[Long](tableName + ".userId") ~
      get[Long](tableName + ".courseId") ~
      get[String](tableName + ".message") map {
      case id~userId~courseId~message => AddCourseRequest(id, userId, courseId, message)
    }
  }

  /**
   * Finds a course membership by the id
   * @param id The id of the membership
   * @return If a course membership was found, then Some[AddCourseRequest], otherwise None
   */
  def findById(id: Long): Option[AddCourseRequest] = findById(tableName, id, simple)

  /**
   * Lists all course membership
   * @return The list of course memberships
   */
  def list: List[AddCourseRequest] = list(tableName, simple)

  def listByCourse (course: Course): List[AddCourseRequest] =
    DB.withConnection {
      implicit connection =>
        anorm.SQL("select * from " + tableName + " where courseId = {id}").on('id -> course.id.get).as(simple *)
    }
}
