package models

import anorm.{NotAssigned, ~, Pk}
import dataAccess.sqlTraits.{SQLDeletable, SQLSelectable, SQLSavable}
import anorm.SqlParser._
import play.api.db.DB
import play.api.Play.current
import play.api.Logger
import controllers.routes
import service.TimeTools

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
                email: Option[String] = None, role: Int = 0, picture: Option[String] = None, accountLinkId: Long = -1)
  extends SQLSavable with SQLDeletable {

  /**
   * Saves the user to the DB
   * @return The possibly updated user
   */
  def save: User = {
    if (id.isDefined) {
      update(User.tableName, 'id -> id, 'authId -> authId, 'authScheme -> authScheme.name, 'username -> username,
        'name -> name.getOrElse(""), 'email -> email.getOrElse(""), 'role -> role, 'picture -> picture,
        'accountLinkId -> accountLinkId)
      this
    } else {
      val id = insert(User.tableName, 'authId -> authId, 'authScheme -> authScheme.name, 'username -> username,
        'name -> name.getOrElse(""), 'email -> email.getOrElse(""), 'role -> role, 'picture -> picture,
        'accountLinkId -> accountLinkId)
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
   * Enrolls the user in a course
   * @param course The course in which the user will be enrolled
   * @param teacher Is this user a teacher of the course?
   * @return The user (for chaining)
   */
  def enroll(course: Course, teacher: Boolean = false): User = {
    CourseMembership(NotAssigned, id.get, course.id.get, teacher).save
    this
  }

  /**
   * Unenroll the user from a course
   * @param course The course from which to unenroll
   * @return The user (for chaining)
   */
  def unenroll(course: Course): User = {

    // First, find the membership
    val membership = CourseMembership.listByUser(this).filter(_.courseId == course.id.get)

    // Check the number or results
    if (membership.size == 1)
    // One membership. So delete it
      membership(0).delete()
    else
    // We didn't get exactly one membership so don't do anything, but warn
      Logger.warn("Multiple (or zero) memberships for user #" + id.get + " in course #" + course.id.get)

    this
  }

  /**
   * Gets the enrollment--courses the user is in--of the user
   * @return The list of courses
   */
  def getEnrollment: List[Course] = CourseMembership.listUsersClasses(this)

  /**
   * Gets the content belonging to this user
   * @return The list of content
   */
  def getContent: List[Content] = ContentOwnership.listUserContent(this)

  /**
   * Create content from a resource and assign this user as the owner
   * @param content The content that will be owned
   * @return The content ownership
   */
  def addContent(content: Content): ContentOwnership =
    ContentOwnership(NotAssigned, this.id.get, content.id.get).save

  /**
   * Get the profile picture. If it's not set then return the placeholder picture.
   * @return The url of the picture
   */
  def getPicture: String = picture.getOrElse(routes.Assets.at("images/users/facePlaceholder.jpg").url)

  /**
   * Tries the user's name, if it doesn't exists then returns the username
   * @return A displayable name
   */
  def displayName: String = name.getOrElse(username)

  /**
   * Check's the user's permission level to see if he/she can create a course.
   * @return
   */
  def canCreateCourse: Boolean = role == User.roles.teacher || role == User.roles.admin

  /**
   * Admins and non-guest members can add content to a course
   * @param course The course to check against
   * @return Can or cannot add content
   */
  def canAddContentTo(course: Course): Boolean =
    role == User.roles.admin || (role != User.roles.guest && course.getMembers.contains(this))

  def canApprove(request: AddCourseRequest, course: Course): Boolean =
    role == User.roles.admin || (canEdit(course) && request.courseId == course.id.get)

  def canEdit(course: Course): Boolean =
    role == User.roles.admin || (role == User.roles.teacher && course.getTeachers.contains(this))

  /**
   * Gets the latest content from this user's courses.
   * @param limit The number of content objects to get
   * @return The content
   */
  def getContentFeed(limit: Int = 5): List[Content] =
    getEnrollment.flatMap(_.getContent)
      .sortWith((c1, c2) => TimeTools.dateToTimestamp(c1.dateAdded) > TimeTools.dateToTimestamp(c2.dateAdded))
      .distinct.take(limit)

  /**
   * Gets the latest announcements made in this user's courses.
   * @param limit The number of announcement to get
   * @return The announcements paired with the course they came from
   */
  def getAnnouncementFeed(limit: Int = 5): List[(Announcement, Course)] =
    getEnrollment.flatMap(course => course.getAnnouncements.map(announcement => (announcement, course)))
      .sortWith((d1, d2) => TimeTools.dateToTimestamp(d1._1.timeMade) > TimeTools.dateToTimestamp(d2._1.timeMade))
      .take(limit)

  /**
   * Submits a teacher request for this user
   * @param reason The reason for the request
   * @return The teacher request
   */
  def requestTeacherStatus(reason: String): TeacherRequest = TeacherRequest(NotAssigned, this.id.get, reason).save

  /**
   * Sends a notification to this user
   * @param message The message of the notification
   * @return The notification
   */
  def sendNotification(message: String): Notification = {
    // TODO: Possibly send an email as well
    Notification(NotAssigned, this.id.get, message).save
  }

  /**
   * Gets a list of the user's notifications
   * @return
   */
  def getNotifications: List[Notification] = {
    Notification.listByUser(this)
  }

  /**
   * Moves user ownership and enrollment from the provided user to the current user
   * @param user The user to move ownership
   */
  def consolidateOwnership(user: User) {
    // Transfer content ownership
    user.getContent.foreach { content => ContentOwnership.findByContent(content).copy(userId = id.get).save }

    // Move the notifications over
    user.getNotifications.foreach { _.copy(userId = id.get).save }

    // Move the announcements over
    Announcement.list.filter(_.userId == user.id.get).foreach { _.copy(userId = id.get).save }

    // Move the course membership over. Check this user's membership to prevent duplicates
    val myMembership = CourseMembership.listByUser(this).map(_.courseId)
    CourseMembership.listByUser(user).foreach(membership => {
      if (myMembership.contains(membership.courseId))
        membership.delete()
      else
        membership.copy(userId = id.get).save
    })

    // Move the teacher request over if this one doesn't have one.
    if (TeacherRequest.findByUser(this).isDefined)
      TeacherRequest.findByUser(user).foreach { _.delete() }
    else
      TeacherRequest.findByUser(user).foreach { _.copy(userId = id.get) }
  }

  /**
   * Merges the provided user into this one.
   * @param user The user to merge
   */
  def merge(user: User) {
    val newRole = math.max(role, user.role)

    /*
     * Three possibilities:
     * 1. Neither user has an account link
     * 2. One user has an account link
     * 3. Both users have an account link
     */
    val id1 = accountLinkId
    val id2 = user.accountLinkId
    if (id1 == -1 && id2 == -1) { // Case 1

      // Transfer ownership
      consolidateOwnership(user)

      // Create an account link and add both users to it, then update the users (role and account link)
      val accountLink = AccountLink(NotAssigned, Set(this, user).map(_.id.get), id.get).save
      this.copy(role = newRole, accountLinkId = accountLink.id.get).save
      user.copy(role = newRole, accountLinkId = accountLink.id.get).save

    } else if((id1 != -1 && id2 == -1) || (id1 == -1 && id2 != -1)) { // Case 2

      // Transfer ownership from this user's primary account to the other user's primary account
      getAccountLink.map(_.getPrimaryUser).getOrElse(this).consolidateOwnership(
        user.getAccountLink.map(_.getPrimaryUser).getOrElse(user)
      )

      // Merge the non-merged user into the other
      val accountLink = AccountLink.findById(math.max(id1, id2)).get // The max id is the one that actually exists
      accountLink.addUser(this).addUser(user).copy(primaryAccount = id.get).save
      this.copy(role = newRole, accountLinkId = accountLink.id.get).save
      user.copy(role = newRole, accountLinkId = accountLink.id.get).save

    } else if(id1 != -1 && id2 != -1) { // Case 3

      // Transfer ownership from this user's primary account to the other user's primary account
      getAccountLink.get.getPrimaryUser.consolidateOwnership(
        user.getAccountLink.get.getPrimaryUser
      )

      // Move all accounts on the other user to this one
      val accountLink1 = AccountLink.findById(id1).get
      val accountLink2 = AccountLink.findById(id2).get
      accountLink1.copy(userIds = accountLink1.userIds ++ accountLink2.userIds, primaryAccount = id.get).save
      accountLink2.getUsers foreach { user =>
        user.copy(accountLinkId = accountLink1.id.get).save
      }
      accountLink2.delete()
    }



  }

  /**
   * Returns the account link
   * @return If it exists, then Some(AccountLink) otherwise None
   */
  def getAccountLink: Option[AccountLink] =
    if (accountLinkId == -1)
      None
    else
      AccountLink.findById(accountLinkId)
}

object User extends SQLSelectable[User] {
  val tableName = "userAccount"

  // User roles
  object roles {
    val guest = 0
    val student = 1
    val teacher = 2
    val admin = 3
  }

  val simple = {
    get[Pk[Long]](tableName + ".id") ~
      get[String](tableName + ".authId") ~
      get[String](tableName + ".authScheme") ~
      get[String](tableName + ".username") ~
      get[String](tableName + ".name") ~
      get[String](tableName + ".email") ~
      get[Int](tableName + ".role") ~
      get[Option[String]](tableName + ".picture") ~
      get[Long](tableName + ".accountLinkId") map {
      case id ~ authId ~ authScheme ~ username ~ name ~ email ~ role ~ picture ~ accountLinkId => {
        val _name = if (name.isEmpty) None else Some(name)
        val _email = if (email.isEmpty) None else Some(email)
        User(id, authId, Symbol(authScheme), username, _name, _email, role, picture, accountLinkId)
      }
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
   * Finds a user based on the username and the authScheme.
   * @param authScheme The auth scheme to search
   * @param username The username to look for
   * @return If a user was found, then Some[User], otherwise None
   */
  def findByUsername(authScheme: Symbol, username: String): Option[User] = {
    DB.withConnection {
      implicit connection =>
        anorm.SQL("select * from userAccount where authScheme = {authScheme} and username = {username}")
          .on('authScheme -> authScheme.name, 'username -> username).as(simple.singleOpt)
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