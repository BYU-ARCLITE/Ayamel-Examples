package models

import anorm.{~, Pk}
import sqlTraits.{SQLSelectable, SQLDeletable, SQLSavable}
import anorm.SqlParser._
import play.api.db.DB
import play.api.Play.current

/**
 * This represents content ownership information
 * @param id The id of this ownership
 * @param userId The id of the owner
 * @param institutionId The id of the institution
 */
case class Directorship(id: Pk[Long], userId: Long, institutionId: Long) extends SQLSavable with SQLDeletable {

  /**
   * Saves the content ownership to the DB
   * @return The possibly updated content ownership
   */
  def save: Directorship = {
    if (id.isDefined) {
      update(Directorship.tableName, 'id -> id, 'userId -> userId, 'institutionId -> institutionId)
      this
    } else {
      val id = insert(Directorship.tableName, 'userId -> userId, 'institutionId -> institutionId)
      this.copy(id)
    }
  }

  /**
   * Deletes the content ownership from the DB
   */
  def delete() {
    delete(Directorship.tableName, id)
  }

}

object Directorship extends SQLSelectable[Directorship] {
  val tableName = "directorship"

  val simple = {
    get[Pk[Long]](tableName + ".id") ~
      get[Long](tableName + ".userId") ~
      get[Long](tableName + ".institutionId") map {
      case id ~ userId ~ institutionId => Directorship(id, userId, institutionId)
    }
  }

  /**
   * Search the DB for content ownership with the given id.
   * @param id The id of the content ownership.
   * @return If a user was found, then Some[ContentOwnership], otherwise None
   */
  def findById(id: Long): Option[Directorship] = findById(Directorship.tableName, id, simple)

  /**
   * Gets all content ownership in the DB
   * @return The list of content ownership
   */
  def list: List[Directorship] = list(Directorship.tableName, simple)

  /**
   * Lists the directorship pertaining to a certain user
   * @param user The user for whom the directorship will be
   * @return The list of directorships
   */
  def listByUser(user: User): List[Directorship] =
    DB.withConnection {
      implicit connection =>
        anorm.SQL("select * from " + tableName + " where userId = {id}").on('id -> user.id).as(simple *)
    }

  /**
   * Gets all institutions of which the user is a director
   * @param user The user who is the director
   * @return The list of institutions
   */
  def listUsersInstitutions(user: User): List[Institution] =
    DB.withConnection {
      implicit connection =>
        anorm.SQL("select * from " + Institution.tableName + " join " + tableName + " on " + Institution.tableName +
          ".id = " + tableName + ".institutionId where " + tableName + ".userId = {userId}").on('userId -> user.id)
          .as(Institution.simple *)
    }

  /**
   * Get the directors of a certain institution
   * @param institution The institution for which the directors will be listed
   * @return The list of director users
   */
  def listInstitutionDirectors(institution: Institution): List[User] =
    DB.withConnection {
      implicit connection =>
        anorm.SQL("select * from " + User.tableName + " join " + tableName + " on " + User.tableName + ".id = " +
          tableName + ".userId where " + tableName + ".institutionId = {institutionId}")
          .on('institutionId -> institution.id).as(User.simple *)
    }
}