package models

import anorm._
import anorm.SqlParser._
import dataAccess.sqlTraits.{SQLDeletable, SQLSelectable, SQLSavable}
import play.api.db.DB
import play.api.Play.current
import play.api.Logger
import controllers.routes


case class AddCourseRequest (id:Option [Long], userId:Long, courseId:Long, message: String) extends SQLSavable with SQLDeletable {
  /**
   * Saves the content ownership to the DB
   * @return The possibly updated content ownership
   */
  def save =
    if (id.isDefined) {
      update(AddCourseRequest.tableName, 'userId -> userId, 'courseId -> courseId, 'message -> message)
      this
    } else {
      val id = insert(AddCourseRequest.tableName, 'userId -> userId, 'courseId -> courseId, 'message -> message)
      this.copy(id)
    }

  /**
   * Deletes the content ownership from the DB
   */
  def delete() {
    delete(AddCourseRequest.tableName)
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
    // Notify the user and add him to the course
    getCourse.foreach( course => 
      getUser.foreach(_.enroll(course).sendNotification("You have been added to the course \"" + course.name + "\"."))
    )
    delete()
  }

  def deny() {
    // Notify the user
    getCourse.foreach( course => 
      getUser.foreach(_.sendNotification("You have been denied access to the course \"" + course.name + "\"."))
    )
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
      user
    }

    var course: Option[Course] = None

    def getCourse = {
      if (course.isEmpty)
        course = Course.findById(courseId)
      course
    }
  }

  def getUser: Option[User] = cache.getUser

  def getCourse: Option[Course] = cache.getCourse
}

object AddCourseRequest extends SQLSelectable[AddCourseRequest] {
  val tableName = "addCourseRequest"

  val simple = {
    get[Option[Long]](tableName + ".id") ~
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
  def findById(id: Long): Option[AddCourseRequest] = findById(id, simple)

  /**
   * Lists all course membership
   * @return The list of course memberships
   */
  def list: List[AddCourseRequest] = list(simple)

  def listByCourse (course: Course): List[AddCourseRequest] =
    listByCol("courseId", course.id, simple)
    
  def listByUser (user: User): List[AddCourseRequest] =
    listByCol("userId", user.id, simple)
}
