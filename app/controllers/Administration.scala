package controllers

import authentication.Authentication
import play.api.mvc.{RequestHeader, Result, Request, Controller}
import models._
import service.FileUploader
import scala.concurrent.ExecutionContext
import ExecutionContext.Implicits.global
import anorm.NotAssigned
import play.api.Logger

/**
 * Controller for Administration pages and actions
 */
object Administration extends Controller {

  /**
   * Admin dashboard view
   */
  def admin = Authentication.authenticatedAction() {
    implicit request =>
      implicit user =>
        Authentication.enforceRole(User.roles.admin) {
          Ok(views.html.admin.dashboard())
        }
  }

  /**
   * Teacher request approval view
   */
  def teacherApprovalPage = Authentication.authenticatedAction() {
    implicit request =>
      implicit user =>
        Authentication.enforceRole(User.roles.admin) {
          val requests = TeacherRequest.list
          Ok(views.html.admin.teacherRequests(requests))
        }
  }

  /**
   * Helper function for finding the teacher request
   * @param id The ID of the teacher request
   * @param f The function to execute with the teacher request
   */
  def getTeacherRequest(id: Long)(f: TeacherRequest => Result)(implicit request: Request[_]) = {
    TeacherRequest.findById(id).map( tr => f(tr) ).getOrElse(Errors.notFound)
  }

  /**
   * Approves a teacher request
   * @param id The ID of the teacher request
   */
  def approveTeacher(id: Long) = Authentication.authenticatedAction() {
    implicit request =>
      implicit user =>
        Authentication.enforceRole(User.roles.admin) {
          getTeacherRequest(id) {
            teacherRequest =>
              teacherRequest.approve()
              Redirect(routes.Administration.teacherApprovalPage()).flashing("info" -> "Teacher request approved")
          }
        }
  }

  /**
   * Denies a teacher request
   * @param id The ID of the teacher request
   */
  def denyTeacher(id: Long) = Authentication.authenticatedAction() {
    implicit request =>
      implicit user =>

        Authentication.enforceRole(User.roles.admin) {
          getTeacherRequest(id) {
            teacherRequest =>
              teacherRequest.deny()
              Redirect(routes.Administration.teacherApprovalPage()).flashing("info" -> "Teacher request denied")
          }
        }
  }

  /**
   * User management view
   */
  def manageUsers = Authentication.authenticatedAction() {
    implicit request =>
      implicit user =>
        Authentication.enforceRole(User.roles.admin) {
          Ok(views.html.admin.users(User.list))
        }
  }

  /**
   * User login information view
   */
  def logins = Authentication.authenticatedAction() {
    implicit request =>
      implicit user =>
        Authentication.enforceRole(User.roles.admin) {
          Ok(views.html.admin.logins(User.list))
        }
  }

  /**
   * Helper function for finding user accounts
   * @param id The ID of the user account
   * @param f The function which will be called with the user
   */
  def getUser(id: Long)(f: User => Result)(implicit request: RequestHeader): Result = {
    User.findById(id).map {
      user =>
        f(user.getAccountLink.map(_.getPrimaryUser).getOrElse(user))
    }.getOrElse(Errors.notFound)
  }

  /**
   * Sets the role of the user
   */
  def setRole() = Authentication.authenticatedAction(parse.urlFormEncoded) {
    implicit request =>
      implicit user =>
        Authentication.enforceRole(User.roles.admin) {
          val id = request.body("userId")(0).toLong
          getUser(id) {
            targetUser =>

            // Set the user's role
              val role = request.body("role")(0).toInt
              targetUser.copy(role = role).save
              Redirect(routes.Administration.manageUsers()).flashing("info" -> "User role update")
          }
        }
  }

  /**
   * Sends a notification to a user
   */
  def sendNotification = Authentication.authenticatedAction(parse.urlFormEncoded) {
    implicit request =>
      implicit user =>
        Authentication.enforceRole(User.roles.admin) {
          val id = request.body("userId")(0).toLong
          getUser(id) {
            targetUser =>

            // Send a notification to the user
              val message = request.body("message")(0)
              targetUser.sendNotification(message)
              Redirect(routes.Administration.manageUsers()).flashing("info" -> "Notification sent to user")
          }
        }
  }

  /**
   * Deletes a user
   * @param id The ID of the user
   */
  def delete(id: Long) = Authentication.authenticatedAction() {
    implicit request =>
      implicit user =>
        Authentication.enforceRole(User.roles.admin) {
          getUser(id) {
            targetUser =>

            // Delete the user
              targetUser.delete()
              Redirect(routes.Administration.manageUsers()).flashing("info" -> "User deleted")
          }
        }
  }

  /**
   * The course management view
   */
  def manageCourses = Authentication.authenticatedAction() {
    implicit request =>
      implicit user =>
        Authentication.enforceRole(User.roles.admin) {
          val courses = Course.list
          Ok(views.html.admin.courses(courses))
        }
  }

  /**
   * Updates the name and enrollment of the course
   * @param id The ID of the course
   */
  def editCourse(id: Long) = Authentication.authenticatedAction(parse.urlFormEncoded) {
    implicit request =>
      implicit user =>
        Authentication.enforceRole(User.roles.admin) {
          Courses.getCourse(id) {
            course =>

            // Update the course
              val params = request.body.mapValues(_(0))
              course.copy(name = params("name"), enrollment = Symbol(params("enrollment"))).save
              Redirect(routes.Administration.manageCourses()).flashing("info" -> "Course updated")
          }
        }
  }

  /**
   * Deletes a course
   * @param id The ID of the course to delete
   */
  def deleteCourse(id: Long) = Authentication.authenticatedAction() {
    implicit request =>
      implicit user =>
        Authentication.enforceRole(User.roles.admin) {
          Courses.getCourse(id) {
            course =>

            // Delete the course
              course.delete()
              Redirect(routes.Administration.manageCourses()).flashing("info" -> "Course deleted")
          }
        }
  }

  /**
   * The content management view
   */
  def manageContent = Authentication.authenticatedAction() {
    implicit request =>
      implicit user =>
        Authentication.enforceRole(User.roles.admin) {
          val content = Content.list
          Ok(views.html.admin.content(content))
        }
  }

  /**
   * Updates the settings of multiple content items
   */
  def batchUpdateContent = Authentication.authenticatedAction(parse.urlFormEncoded) {
    implicit request =>
      implicit user =>
        Authentication.enforceRole(User.roles.admin) {

          val params = request.body.mapValues(_(0))
          val content = params("ids").split(",").filterNot(_.isEmpty).map(id => Content.findById(id.toLong).get)

          // Update the content
          val shareability = params("shareability").toInt
          val visibility = params("visibility").toInt
          content.foreach(_.copy(shareability = shareability, visibility = visibility).save)
          Redirect(routes.Administration.manageContent()).flashing("info" -> "Contents updated")
        }
  }

  /**
   * The home page content view
   */
  def homePageContent = Authentication.authenticatedAction() {
    implicit request =>
      implicit user =>
        Authentication.enforceRole(User.roles.admin) {
          Ok(views.html.admin.homePageContent())
        }
  }

  /**
   * Creates new home page content
   */
  def createHomePageContent = Authentication.authenticatedAction(parse.multipartFormData) {
    implicit request =>
      implicit user =>
        Authentication.enforceRole(User.roles.admin) {

          val data = request.body.dataParts.mapValues(_(0))
          val homePageContent = HomePageContent(NotAssigned,
            data("title"),
            data("text"),
            data("link"),
            data("linkText"),
            data("background"),
            active = false
          )
          if (data("background").isEmpty) {
            val file = request.body.file("file").get
            Async {
              FileUploader.uploadFile(file).map {
                url =>
                  homePageContent.copy(background = url).save
                  Redirect(routes.Administration.homePageContent()).flashing("info" -> "Home page content created")
              }
            }
          } else {
            homePageContent.save
            Redirect(routes.Administration.homePageContent()).flashing("info" -> "Home page content created")
          }
        }
  }

  /**
   * Toggles a particular home page content
   * @param id The ID of the home page content
   */
  def toggleHomePageContent(id: Long) = Authentication.authenticatedAction() {
    implicit request =>
      implicit user =>
        Authentication.enforceRole(User.roles.admin) {

          val homePageContent = HomePageContent.findById(id).get
          homePageContent.copy(active = !homePageContent.active).save
          val message =
            if (homePageContent.active) "no longer active."
            else "now active."
          Redirect(routes.Administration.homePageContent()).flashing("info" -> ("Home page content is " + message))
        }
  }

  /**
   * Deletes a particular home page content
   * @param id The ID of the home page content
   */
  def deleteHomePageContent(id: Long) = Authentication.authenticatedAction() {
    implicit request =>
      implicit user =>
        Authentication.enforceRole(User.roles.admin) {

          val homePageContent = HomePageContent.findById(id).get
          homePageContent.delete()
          Redirect(routes.Administration.homePageContent()).flashing("info" -> "Home page content deleted")
        }
  }

  /**
   * The feedback view
   */
  def feedback = Authentication.authenticatedAction() {
    implicit request =>
      implicit user =>
        Authentication.enforceRole(User.roles.admin) {

          Ok(views.html.admin.feedback(Feedback.list))
        }
  }

  /**
   * Deletes a particular feedback item
   * @param id The ID of the feedback item
   */
  def deleteFeedback(id: Long) = Authentication.authenticatedAction() {
    implicit request =>
      implicit user =>
        Authentication.enforceRole(User.roles.admin) {

          Feedback.findById(id).get.delete()
          Redirect(routes.Administration.feedback()).flashing("info" -> "Feedback deleted")
        }
  }

  /**
   * The site settings view
   */
  def siteSettings = Authentication.authenticatedAction() {
    implicit request =>
      implicit user =>
        Authentication.enforceRole(User.roles.admin) {

          Ok(views.html.admin.settings(Setting.list))
        }
  }

  /**
   * Saves and updates the site settings
   */
  def saveSiteSettings = Authentication.authenticatedAction(parse.urlFormEncoded) {
    implicit request =>
      implicit user =>
        Authentication.enforceRole(User.roles.admin) {

          request.body.mapValues(_(0)).foreach(data => Setting.findByName(data._1).get.copy(value = data._2).save)
          request.body.mapValues(_(0)).foreach(data => Logger.debug(data._1 + ": " + data._2))
          Redirect(routes.Administration.siteSettings()).flashing("info" -> "Settings updated")
        }
  }

  /**
   * Proxies in as a different user
   * @param id The ID of the user to be proxied in as
   */
  def proxy(id: Long) = Authentication.authenticatedAction() {
    implicit request =>
      implicit user =>
        Authentication.enforceRole(User.roles.admin) {

          val proxyUser = User.findById(id).get
          Redirect(routes.Application.home()).withSession("userId" -> id.toString)
            .flashing("info" -> ("You are now using the site as " + proxyUser.displayName + ". To end proxy you must log out then back in with your normal account."))
        }
  }
}
