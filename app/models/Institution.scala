package models

import anorm.{NotAssigned, ~, Pk}
import sqlTraits.{SQLDeletable, SQLSelectable, SQLSavable}
import anorm.SqlParser._

/**
 * An institution, which represents a university or language center
 * @param id The id of the institution
 * @param name The name of the institution
 * @param location Where it is located
 * @param description Any kind of description
 * @param logo The URL of a logo
 */
case class Institution(id: Pk[Long], name: String, location: String, description: String, logo: Option[String])
  extends SQLSavable with SQLDeletable {

  /**
   * Saves the institution to the DB
   * @return The possibly modified institution
   */
  def save: Institution = {
    if (id.isDefined) {
      update(Institution.tableName, 'id -> id, 'name -> name, 'location -> location, 'description -> description,
        'logo -> logo)
      this
    } else {
      val id = insert(Institution.tableName, 'name -> name, 'location -> location, 'description -> description)
      this.copy(id)
    }
  }

  /**
   * Deletes the institution from the DB
   */
  def delete() {
    delete(Institution.tableName, id)
  }

  //      Logic
  // ===============

  /**
   * Get the directors of this institution
   * @return The list of users
   */
  def getDirectors: List[User] = Directorship.listInstitutionDirectors(this)

  /**
   * Get the courses of this institution
   * @return The list of courses
   */
  def getCourses: List[Course] = CourseListing.listByInstitution(this)

}

object Institution extends SQLSelectable[Institution] {
  val tableName = "institution"

  val simple = {
    get[Pk[Long]](tableName + ".id") ~
      get[String](tableName + ".name") ~
      get[String](tableName + ".location") ~
      get[String](tableName + ".description") ~
      get[Option[String]](tableName + ".logo") map {
      case id ~ name ~ location ~ description ~ logo => Institution(id, name, location, description, logo)
    }
  }

  /**
   * Finds an institution by the given id
   * @param id The id of the institution
   * @return If an institution was found, then Some[Institution], otherwise None
   */
  def findById(id: Long): Option[Institution] = findById(tableName, id, simple)

  /**
   * Lists all institutions
   * @return The list of institutions
   */
  def list: List[Institution] = list(tableName, simple)

  /**
   * Create a institution from fixture data
   * @param data Fixture data
   * @return The institution
   */
  def fromFixture(data: (String, String, String, Option[String])): Institution =
    Institution(NotAssigned, data._1, data._2, data._3, data._4)
}