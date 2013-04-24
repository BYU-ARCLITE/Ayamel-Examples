package controllers

import authentication.Authentication
import play.api.mvc.{RequestHeader, Result, Request, Controller}
import models._
import service.{FileUploader, ImageTools, HashTools}
import scala.Some
import javax.imageio.ImageIO
import scala.concurrent.ExecutionContext
import ExecutionContext.Implicits.global
import anorm.NotAssigned

/**
 * Created with IntelliJ IDEA.
 * User: camman3d
 * Date: 3/27/13
 * Time: 10:52 AM
 * To change this template use File | Settings | File Templates.
 */
object Users extends Controller {

  def notifications = Authentication.authenticatedAction() {
    implicit request =>
      implicit user =>
        Ok(views.html.users.notifications())
  }

  def markNotification(id: Long) = Authentication.authenticatedAction() {
    implicit request =>
      implicit user =>

        // Make sure the notification exists
        val notification = Notification.findById(id)
        if (notification.isDefined) {
          // Make sure the notification belongs to the user
          if (user.getNotifications.contains(notification.get)) {
            notification.get.copy(messageRead = true).save
            Redirect(routes.Users.notifications())flashing("info" -> "Notification marked as read.")
          } else
            Errors.forbidden
        } else
          Errors.notFound
  }

  def accountSettings = Authentication.authenticatedAction() {
    implicit request =>
      implicit user =>

        Ok(views.html.users.accountSettings())
  }

  def saveSettings = Authentication.authenticatedAction(parse.urlFormEncoded) {
    implicit request =>
      implicit user =>

        // Change the user information
        val name = request.body("name")(0)
        val email = request.body("email")(0)
        user.copy(name = Some(name), email = Some(email)).save

        Redirect(routes.Users.accountSettings()).flashing("info" -> "Personal information updated.")
  }

  def changePassword = Authentication.authenticatedAction(parse.urlFormEncoded) {
    implicit request =>
      implicit user =>

        val password1 = request.body("password1")(0)
        val password2 = request.body("password2")(0)

        // Make sure the passwords match
        if (password1 == password2) {
          user.copy(authId = HashTools.sha256Base64(password1)).save
          Redirect(routes.Users.accountSettings()).flashing("info" -> "Password changed.")
        } else
          Redirect(routes.Users.accountSettings()).flashing("alert" -> "Passwords don't match.")
  }

  def uploadProfilePicture = Authentication.authenticatedAction(parse.multipartFormData) {
    implicit request =>
      implicit user =>

        // Load the image from the file and make it into a thumbnail
        val file = request.body.file("file").get
        val image = ImageTools.makeThumbnail(ImageIO.read(file.ref.file))

        // Upload the file
        Async {
          FileUploader.uploadImage(image, file.filename).map { url =>

            // Save the user info about the profile picture
            user.copy(picture = Some(url)).save
            Redirect(routes.Users.accountSettings()).flashing("info" -> "Profile picture updated")
          }
        }
  }

  def teacherRequestPage = Authentication.authenticatedAction() {
    implicit request =>
      implicit user =>

        // Check that the user is a student (not guest, teacher, or admin)
        Authentication.enforceRole(User.roles.student) {

          // Check to see if the user has already submitted a request
          val teacherRequest = TeacherRequest.findByUser(user)
          if (teacherRequest.isDefined)
            Ok(views.html.users.teacherRequest.status())
          else
            Ok(views.html.users.teacherRequest.requestForm())
        }
  }

  def submitTeacherRequest = Authentication.authenticatedAction(parse.urlFormEncoded) {
    implicit request =>
      implicit user =>

        // Check that the user is a student (not guest, teacher, or admin)
        Authentication.enforceRole(User.roles.student) {

          // Check to see if the user has already submitted a request
          val teacherRequest = TeacherRequest.findByUser(user)
          if (teacherRequest.isEmpty) {

            // Collect the information
            val name = request.body("name")(0)
            val email = request.body("email")(0)
            val reason = request.body("reason")(0)

            // Try to update user information
            var updatedUser = user
            if (user.name.isEmpty)
              updatedUser = user.copy(name = Some(name)).save
            if (user.email.isEmpty)
              updatedUser = user.copy(email = Some(email)).save

            // Create the request
            updatedUser.requestTeacherStatus(reason)
            Redirect(routes.Application.home()).flashing("success" -> "Your teacher request has been submitted.")
          } else
            Ok(views.html.users.teacherRequest.status())
        }
  }

  // Admin actions

  def admin = Authentication.authenticatedAction() {
    implicit request =>
      implicit user =>
        Authentication.enforceRole(User.roles.admin) {
          Ok(views.html.users.admin.dashboard())
        }
  }

  def teacherApprovalPage = Authentication.authenticatedAction() {
    implicit request =>
      implicit user =>
        Authentication.enforceRole(User.roles.admin) {
          val requests = TeacherRequest.list
          Ok(views.html.users.admin.teacherRequests(requests))
        }
  }

  def getTeacherRequest(id: Long)(f: TeacherRequest => Result)(implicit request: Request[_]) = {
    val teacherRequest = TeacherRequest.findById(id)
    if (teacherRequest.isDefined)
      f(teacherRequest.get)
    else
      Errors.notFound
  }

  def approveTeacher(id: Long) = Authentication.authenticatedAction() {
    implicit request =>
      implicit user =>
        Authentication.enforceRole(User.roles.admin) {
          getTeacherRequest(id) {
            teacherRequest =>
              teacherRequest.approve()
              Redirect(routes.Users.teacherApprovalPage()).flashing("info" -> "Teacher request approved")
          }
        }
  }

  def denyTeacher(id: Long) = Authentication.authenticatedAction() {
    implicit request =>
      implicit user =>

        Authentication.enforceRole(User.roles.admin) {
          getTeacherRequest(id) {
            teacherRequest =>
              teacherRequest.deny()
              Redirect(routes.Users.teacherApprovalPage()).flashing("info" -> "Teacher request denied")
          }
        }
  }

  def manageUsers = Authentication.authenticatedAction() {
    implicit request =>
      implicit user =>
        Authentication.enforceRole(User.roles.admin) {
          val users = User.list
          Ok(views.html.users.admin.users(users))
        }
  }

  def getUser(id: Long)(f: User => Result)(implicit request: RequestHeader): Result = {
    val user = User.findById(id)
    if (user.isDefined) {
      val accountLink = user.get.getAccountLink
      if (accountLink.isDefined)
        f(accountLink.get.getPrimaryUser)
      else
        f(user.get)
    } else
      Errors.notFound
  }

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
              Redirect(routes.Users.manageUsers()).flashing("info" -> "User role update")
          }
        }
  }

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
              Redirect(routes.Users.manageUsers()).flashing("info" -> "Notification sent to user")
          }
        }
  }

  def delete(id: Long) = Authentication.authenticatedAction(parse.urlFormEncoded) {
    implicit request =>
      implicit user =>
        Authentication.enforceRole(User.roles.admin) {
          getUser(id) {
            targetUser =>

              // Delete the user
              targetUser.delete()
              Redirect(routes.Users.manageUsers()).flashing("info" -> "User deleted")
          }
        }
  }

  def manageCourses = Authentication.authenticatedAction() {
    implicit request =>
      implicit user =>
        Authentication.enforceRole(User.roles.admin) {
          val courses = Course.list
          Ok(views.html.users.admin.courses(courses))
        }
  }

  def deleteCourse(id: Long) = Authentication.authenticatedAction() {
    implicit request =>
      implicit user =>
        Authentication.enforceRole(User.roles.admin) {
          Courses.getCourse(id) {
            course =>

              // Delete the course
              course.delete()
              Redirect(routes.Users.manageCourses()).flashing("info" -> "Course deleted")
          }
        }
  }

  def manageContent = Authentication.authenticatedAction() {
    implicit request =>
      implicit user =>
        Authentication.enforceRole(User.roles.admin) {
          val content = Content.list
          Ok(views.html.users.admin.content(content))
        }
  }

  def homePageContent = Authentication.authenticatedAction() {
    implicit request =>
      implicit user =>
        Authentication.enforceRole(User.roles.admin) {
          Ok(views.html.users.admin.homePageContent())
        }
  }

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
              FileUploader.uploadFile(file).map { url =>
                homePageContent.copy(background = url).save
                Redirect(routes.Users.homePageContent()).flashing("info" -> "Home page content created")
              }
            }
          } else {
            homePageContent.save
            Redirect(routes.Users.homePageContent()).flashing("info" -> "Home page content created")
          }
        }
  }

  def toggleHomePageContent(id: Long) = Authentication.authenticatedAction() {
    implicit request =>
      implicit user =>
        Authentication.enforceRole(User.roles.admin) {

          val homePageContent = HomePageContent.findById(id).get
          homePageContent.copy(active = !homePageContent.active).save
          val message =
            if (homePageContent.active) "no longer active."
            else "now active."
          Redirect(routes.Users.homePageContent()).flashing("info" -> ("Home page content is " + message))
        }
  }

  def deleteHomePageContent(id: Long) = Authentication.authenticatedAction() {
    implicit request =>
      implicit user =>
        Authentication.enforceRole(User.roles.admin) {

          val homePageContent = HomePageContent.findById(id).get
          homePageContent.delete()
          Redirect(routes.Users.homePageContent()).flashing("info" -> "Home page content deleted")
        }
  }

}
