package models

import anorm.{NotAssigned, ~, Pk}
import sqlTraits.{SQLDeletable, SQLSelectable, SQLSavable}
import anorm.SqlParser._
import play.api.db.DB
import play.api.Play.current
import play.api.Logger

/**
 * User
 * @param id The ID of the user.
 * @param authId ID returned from authentication
 * @param authScheme Which authentication scheme this user used
 * @param username The username (often the same as authId)
 * @param name A displayable name for the user
 * @param email The user's email address
 * @param role The permissions of the user
 */
case class User(id: Pk[Long], authId: String, authScheme: Symbol, username: String, name: Option[String] = None,
                email: Option[String] = None, role: Int = 0) extends SQLSavable with SQLDeletable {

  /**
   * Saves the user to the DB
   * @return The possibly updated user
   */
  def save: User = {
    if (id.isDefined) {
      update(User.tableName, 'id -> id, 'authId -> authId, 'authScheme -> authScheme.name, 'username -> username,
        'name -> name.getOrElse(""), 'email -> email.getOrElse(""), 'role -> role)
      this
    } else {
      val id = insert(User.tableName, 'authId -> authId, 'authScheme -> authScheme.name, 'username -> username,
        'name -> name.getOrElse(""), 'email -> email.getOrElse(""), 'role -> role)
      this.copy(id)
    }
  }

  /**
   * Deletes the user from the DB
   */
  def delete() {
    delete(User.tableName, id)
  }

  //      Logic
  // ===============

  /**
   * Enrolls the user in a class
   * @param _class The class in which the user will be enrolled
   * @param teacher Is this user a teacher of the class?
   * @return The user (for chaining)
   */
  def enroll(_class: Class, teacher: Boolean = false): User = {
    ClassMembership(NotAssigned, id.get, _class.id.get, teacher).save
    this
  }

  /**
   * Unenroll the user from a class
   * @param _class The class from which to unenroll
   * @return The user (for chaining)
   */
  def unenroll(_class: Class): User = {
    // First, find the membership
    val membership = {
      ClassMembership.listClassMembers(_class, teacher = true) ++
        ClassMembership.listClassMembers(_class, teacher = false)
    }.filter(user => user == this)

    // Check the number or results
    if (membership.size == 1)
      // One membership. So delete it
      membership(0).delete()
    else
      // We didn't get exactly one membership so don't do anything, but warn
      Logger.warn("Multiple memberships for user #" + id.get + " in class #" + _class.id.get)

    this
  }

  /**
   * Gets the enrollment--classes the user is in--of the user
   * @return The list of classes
   */
  def getEnrollment: List[Class] = ClassMembership.listUsersClasses(this)

  /**
   * Gets the messages to the user
   * @return The list of messages
   */
  def getMessages: List[Message] = Message.listByUser(this)

  /**
   * Gets the content belonging to this user
   * @return The list of content
   */
  def getContent: List[Content] = ContentOwnership.listByUser(this)

  /**
   * Get the institutions of which this user is a director
   * @return The list of institutions
   */
  def getInstitutions: List[Institution] = Directorship.listByUser(this)

  /**
   * Create content from a resource and assign this user as the owner
   * @param resourceId The ID of the resource
   * @return This user (for chaining)
   */
  def addContent(resourceId: String): User = {
    val content = Content(NotAssigned, resourceId).save
    ContentOwnership(NotAssigned, this.id.get, content.id.get).save
    this
  }
}

object User extends SQLSelectable[User] {
  val tableName = "userAccount"

  val simple = {
    get[Pk[Long]](tableName + ".id") ~
      get[String](tableName + ".authId") ~
      get[String](tableName + ".authScheme") ~
      get[String](tableName + ".username") ~
      get[String](tableName + ".name") ~
      get[String](tableName + ".email") ~
      get[Int](tableName + ".role") map {
      case id~authId~authScheme~username~name~email~role => User(id, authId, Symbol(authScheme), username,
        if(name.isEmpty) None else Some(name), if(email.isEmpty) None else Some(email), role)
    }
  }

  /**
   * Search the DB for a user with the given id.
   * @param id The id of the user.
   * @return If a user was found, then Some[User], otherwise None
   */
  def findById(id: Long): Option[User] = findById(User.tableName, id, simple)

  /**
   * Search the DB for a user with the given authentication info
   * @param authId The id from the auth scheme
   * @param authScheme Which auth scheme
   * @return If a user was found, then Some[User], otherwise None
   */
  def findByAuthInfo(authId: String, authScheme: Symbol): Option[User] = {
    DB.withConnection {
      implicit connection =>
        anorm.SQL("select * from userAccount where authId = {authId} and authScheme = {authScheme}")
          .on('authId -> authId, 'authScheme -> authScheme.name).as(simple.singleOpt)
    }
  }

  /**
   * Gets all users in the DB
   * @return The list of users
   */
  def list: List[User] = list(User.tableName, simple)

  /**
   * Create a user from fixture data
   * @param data Fixture data
   * @return The user
   */
  def fromFixture(data: (String, Symbol, String, Option[String], Option[String], Int)): User =
    User(NotAssigned, data._1, data._2, data._3, data._4, data._5, data._6)
}