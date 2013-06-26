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
 * User: josh
 * Date: 6/26/13
 * Time: 10:18 AM
 * To change this template use File | Settings | File Templates.
 */
object Administration extends Controller {
  def admin = Authentication.authenticatedAction() {
    implicit request =>
      implicit user =>
        Authentication.enforceRole(User.roles.admin) {
          Ok(views.html.admin.dashboard())
        }
  }

  def teacherApprovalPage = Authentication.authenticatedAction() {
    implicit request =>
      implicit user =>
        Authentication.enforceRole(User.roles.admin) {
          val requests = TeacherRequest.list
          Ok(views.html.admin.teacherRequests(requests))
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
              Redirect(routes.Administration.teacherApprovalPage()).flashing("info" -> "Teacher request approved")
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
              Redirect(routes.Administration.teacherApprovalPage()).flashing("info" -> "Teacher request denied")
          }
        }
  }

  def manageUsers = Authentication.authenticatedAction() {
    implicit request =>
      implicit user =>
        Authentication.enforceRole(User.roles.admin) {
          val users = User.list
          Ok(views.html.admin.users(users))
        }
  }

  def logins = Authentication.authenticatedAction() {
    implicit request =>
      implicit user =>
        Authentication.enforceRole(User.roles.admin) {
          val users = User.list
          Ok(views.html.admin.logins(users))
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
              Redirect(routes.Administration.manageUsers()).flashing("info" -> "User role update")
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
              Redirect(routes.Administration.manageUsers()).flashing("info" -> "Notification sent to user")
          }
        }
  }

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

  def manageCourses = Authentication.authenticatedAction() {
    implicit request =>
      implicit user =>
        Authentication.enforceRole(User.roles.admin) {
          val courses = Course.list
          Ok(views.html.admin.courses(courses))
        }
  }

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

  def manageContent = Authentication.authenticatedAction() {
    implicit request =>
      implicit user =>
        Authentication.enforceRole(User.roles.admin) {
          val content = Content.list
          Ok(views.html.admin.content(content))
        }
  }

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

  def homePageContent = Authentication.authenticatedAction() {
    implicit request =>
      implicit user =>
        Authentication.enforceRole(User.roles.admin) {
          Ok(views.html.admin.homePageContent())
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
                Redirect(routes.Administration.homePageContent()).flashing("info" -> "Home page content created")
              }
            }
          } else {
            homePageContent.save
            Redirect(routes.Administration.homePageContent()).flashing("info" -> "Home page content created")
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
          Redirect(routes.Administration.homePageContent()).flashing("info" -> ("Home page content is " + message))
        }
  }

  def deleteHomePageContent(id: Long) = Authentication.authenticatedAction() {
    implicit request =>
      implicit user =>
        Authentication.enforceRole(User.roles.admin) {

          val homePageContent = HomePageContent.findById(id).get
          homePageContent.delete()
          Redirect(routes.Administration.homePageContent()).flashing("info" -> "Home page content deleted")
        }
  }

  def feedback = Authentication.authenticatedAction() {
    implicit request =>
      implicit user =>
        Authentication.enforceRole(User.roles.admin) {

          Ok(views.html.admin.feedback(Feedback.list))
        }
  }

  def deleteFeedback(id: Long) = Authentication.authenticatedAction() {
    implicit request =>
      implicit user =>
        Authentication.enforceRole(User.roles.admin) {

          Feedback.findById(id).get.delete()
          Redirect(routes.Administration.feedback()).flashing("info" -> "Feedback deleted")
        }
  }

  def siteSettings = Authentication.authenticatedAction() {
    implicit request =>
      implicit user =>
        Authentication.enforceRole(User.roles.admin) {

          Ok(views.html.admin.settings(Setting.list))
        }
  }

  def saveSiteSettings = Authentication.authenticatedAction(parse.urlFormEncoded) {
    implicit request =>
      implicit user =>
        Authentication.enforceRole(User.roles.admin) {

          request.body.mapValues(_(0)).foreach(data => Setting.findByName(data._1).get.copy(value = data._2).save)
          request.body.mapValues(_(0)).foreach(data => Logger.debug(data._1 + ": " + data._2))
          Redirect(routes.Administration.siteSettings()).flashing("info" -> "Settings updated")
        }
  }

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
