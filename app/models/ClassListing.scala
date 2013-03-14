package models

import anorm.{~, Pk}
import sqlTraits.{SQLSelectable, SQLDeletable, SQLSavable}
import anorm.SqlParser._
import play.api.db.DB
import play.api.Play.current

/**
 * This is information about which institutions classes belong to
 * @param id The id of this ownership
 * @param institutionId The id of the institution
 * @param classId The id of the class
 */
case class ClassListing(id: Pk[Long], institutionId: Long, classId: Long) extends SQLSavable with SQLDeletable {

  /**
   * Saves the class listing to the DB
   * @return The possibly updated class listing
   */
  def save: ClassListing = {
    if (id.isDefined) {
      update(ClassListing.tableName, 'id -> id, 'institutionId -> institutionId, 'classId -> classId)
      this
    } else {
      val id = insert(ClassListing.tableName, 'institutionId -> institutionId, 'classId -> classId)
      this.copy(id)
    }
  }

  /**
   * Deletes the class listing from the DB
   */
  def delete() {
    delete(ClassListing.tableName, id)
  }

}

object ClassListing extends SQLSelectable[ClassListing] {
  val tableName = "classListing"

  val simple = {
    get[Pk[Long]](tableName + ".id") ~
      get[Long](tableName + ".institutionId") ~
      get[Long](tableName + ".classId") map {
      case id ~ institutionId ~ classId => ClassListing(id, institutionId, classId)
    }
  }

  /**
   * Search the DB for class listing with the given id.
   * @param id The id of the class listing.
   * @return If a class listing was found, then Some[ClassListing], otherwise None
   */
  def findById(id: Long): Option[ClassListing] = findById(ClassListing.tableName, id, simple)

  /**
   * Gets all class listing in the DB
   * @return The list of class listing
   */
  def list: List[ClassListing] = list(ClassListing.tableName, simple)

  /**
   * Gets all classes belonging to a certain institution
   * @param institution The institution for which the classes will be listed
   * @return The list of classes
   */
  def listByInstitution(institution: Institution): List[Class] =
    DB.withConnection {
      implicit connection =>
        anorm.SQL("select * from " + Class.tableName + " join " + tableName + " on " + Class.tableName + ".id = " +
          tableName + ".classId where " + tableName + ".institutionId = {institutionId}").on('institutionId -> institution.id)
          .as(Class.simple *)
    }
}
