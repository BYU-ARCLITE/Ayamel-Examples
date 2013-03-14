package models

import sqlTraits.{SQLSelectable, SQLDeletable, SQLSavable}
import anorm.{~, Pk}
import anorm.SqlParser._
import play.api.db.DB
import play.api.Play.current

/**
 * Represents the membership of a user in a class
 * @param id The id of the membership
 * @param userId The id of the user that is enrolled
 * @param classId The id of the class in which the user is enrolled
 * @param teacher Is the user a teacher?
 */
case class ClassMembership(id: Pk[Long], userId: Long, classId: Long, teacher: Boolean) extends SQLSavable with SQLDeletable {

  /**
   * Saves the class membership to the DB
   * @return The possibly modified class membership
   */
  def save: ClassMembership = {
    if (id.isDefined) {
      update(ClassMembership.tableName, 'id -> id, 'userId -> userId, 'classId -> classId, 'teacher -> teacher)
      this
    } else {
      val id = insert(ClassMembership.tableName, 'userId -> userId, 'classId -> classId, 'teacher -> teacher)
      this.copy(id)
    }
  }

  /**
   * Deletes the class membership from the DB
   */
  def delete() {
    delete(ClassMembership.tableName, id)
  }

}

object ClassMembership extends SQLSelectable[ClassMembership] {
  val tableName = "classMembership"

  val simple = {
    get[Pk[Long]](tableName + ".id") ~
      get[Long](tableName + ".userId") ~
      get[Long](tableName + ".classId") ~
      get[Boolean](tableName + ".teacher") map {
      case id~userId~classId~teacher => ClassMembership(id, userId, classId, teacher)
    }
  }

  /**
   * Finds a class membership by the id
   * @param id The id of the membership
   * @return If a class membership was found, then Some[ClassMembership], otherwise None
   */
  def findById(id: Long): Option[ClassMembership] = findById(tableName, id, simple)

  /**
   * Finds all classes that a certain user is enrolled in
   * @param user The user for whom the class list will be
   * @return The list of classes
   */
  def listUsersClasses(user: User): List[Class] = {
    DB.withConnection {
      implicit connection =>
        anorm.SQL("select * from " + Class.tableName + " join " + tableName + " on " + Class.tableName + ".id = " +
          tableName + ".classId where " + tableName + ".userId = {id}").on('id -> user.id).as(Class.simple *)
    }
  }

  /**
   * Finds all students or teachers who are enrolled in a certain class
   * @param _class The class in which the users are enrolled
   * @param teacher Get teachers instead of students?
   * @return The list of users
   */
  def listClassMembers(_class: Class, teacher: Boolean): List[User] = {
    DB.withConnection {
      implicit connection =>
        anorm.SQL("select * from " + User.tableName + " join " + tableName + " on " + User.tableName + ".id = " +
          tableName + ".userId where " + tableName + ".classId = {id} and " + tableName + ".teacher = {teacher}")
          .on('id -> _class.id, 'teacher -> teacher).as(User.simple *)
    }
  }

  /**
   * Lists all class membership
   * @return The list of class memberships
   */
  def list: List[ClassMembership] = list(tableName, simple)
}
