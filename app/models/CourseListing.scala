package models

import anorm.{~, Pk}
import sqlTraits.{SQLSelectable, SQLDeletable, SQLSavable}
import anorm.SqlParser._
import play.api.db.DB
import play.api.Play.current

/**
 * This is information about which institutions courses belong to
 * @param id The id of this ownership
 * @param institutionId The id of the institution
 * @param courseId The id of the course
 */
case class CourseListing(id: Pk[Long], institutionId: Long, courseId: Long) extends SQLSavable with SQLDeletable {

  /**
   * Saves the course listing to the DB
   * @return The possibly updated course listing
   */
  def save: CourseListing = {
    if (id.isDefined) {
      update(CourseListing.tableName, 'id -> id, 'institutionId -> institutionId, 'courseId -> courseId)
      this
    } else {
      val id = insert(CourseListing.tableName, 'institutionId -> institutionId, 'courseId -> courseId)
      this.copy(id)
    }
  }

  /**
   * Deletes the course listing from the DB
   */
  def delete() {
    delete(CourseListing.tableName, id)
  }

}

object CourseListing extends SQLSelectable[CourseListing] {
  val tableName = "courseListing"

  val simple = {
    get[Pk[Long]](tableName + ".id") ~
      get[Long](tableName + ".institutionId") ~
      get[Long](tableName + ".courseId") map {
      case id ~ institutionId ~ courseId => CourseListing(id, institutionId, courseId)
    }
  }

  /**
   * Search the DB for course listing with the given id.
   * @param id The id of the course listing.
   * @return If a course listing was found, then Some[CourseListing], otherwise None
   */
  def findById(id: Long): Option[CourseListing] = findById(CourseListing.tableName, id, simple)

  /**
   * Gets all course listing in the DB
   * @return The list of course listing
   */
  def list: List[CourseListing] = list(CourseListing.tableName, simple)

  /**
   * Gets all courses belonging to a certain institution
   * @param institution The institution for which the courses will be listed
   * @return The list of courses
   */
  def listByInstitution(institution: Institution): List[Course] =
    DB.withConnection {
      implicit connection =>
        anorm.SQL("select * from " + Course.tableName + " join " + tableName + " on " + Course.tableName + ".id = " +
          tableName + ".courseId where " + tableName + ".institutionId = {institutionId}").on('institutionId -> institution.id)
          .as(Course.simple *)
    }
}
