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
import play.api.Logger

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

  def deleteNotification(id: Long) = Authentication.authenticatedAction() {
    implicit request =>
      implicit user =>

        // Make sure the notification exists
        val notification = Notification.findById(id)
        if (notification.isDefined) {
          // Make sure the notification belongs to the user
          if (user.getNotifications.contains(notification.get)) {
            notification.get.delete()
            Redirect(routes.Users.notifications())flashing("info" -> "Notification deleted.")
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

}
