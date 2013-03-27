package controllers

import authentication.Authentication
import play.api.mvc.{Result, Request, Controller}
import models.{Notification, User, TeacherRequest}

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

  def saveSettings = TODO

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

}
