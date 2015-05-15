package controllers

import authentication.Authentication
import play.api.mvc.{RequestHeader, Result, Request, Controller}
import models._
import service.FileUploader
import scala.concurrent._
import scala.concurrent.duration._
import ExecutionContext.Implicits.global
import anorm.NotAssigned
import play.api.Logger
import dataAccess.ResourceController

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
        Authentication.enforcePermission("admin") {
          Ok(views.html.admin.dashboard())
        }
  }

  /**
   * Request approval view
   */
  def approvalPage = Authentication.authenticatedAction() {
    implicit request =>
      implicit user =>
        Authentication.enforcePermission("admin") {
          val requests = SitePermissionRequest.list
          Ok(views.html.admin.permissionRequests(requests))
        }
  }

  /**
   * Approves a request
   * @param id The ID of the request
   */
  def approveRequest() = Authentication.authenticatedAction(parse.multipartFormData) {
    implicit request =>
      implicit user =>
        Authentication.enforcePermission("admin") {
		  for( id <- request.body.dataParts("reqid");
		       req <- SitePermissionRequest.findById(id.toLong)
		  ) { req.approve() }
		  Ok
        }
  }

  /**
   * Denies a request
   * @param id The ID of the request
   */
  def denyRequest() = Authentication.authenticatedAction(parse.multipartFormData) {
    implicit request =>
      implicit user =>
        Authentication.enforcePermission("admin") {
		  for( id <- request.body.dataParts("reqid");
		       req <- SitePermissionRequest.findById(id.toLong)
		  ) { req.deny(); }
		  Ok
        }
  }

  /**
   * User management view
   */
  def manageUsers = Authentication.authenticatedAction() {
    implicit request =>
      implicit user =>
        Authentication.enforcePermission("admin") {
          Ok(views.html.admin.users(User.list))
        }
  }

  /**
   * User login information view
   */
  def logins = Authentication.authenticatedAction() {
    implicit request =>
      implicit user =>
        Authentication.enforcePermission("admin") {
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
        f(user.getAccountLink.flatMap(_.getPrimaryUser).getOrElse(user))
    }.getOrElse(Errors.notFound)
  }

  /**
   * Give permissions to a user
   */
  def setPermission() = Authentication.authenticatedAction(parse.multipartFormData) {
    implicit request =>
      implicit user =>
        Authentication.enforcePermission("admin") {
		  val data = request.body.dataParts
          getUser(data("userId")(0).toLong) { targetUser =>
            data("permission").foreach { permission =>
              targetUser.addSitePermission(permission)
            }
            Redirect(routes.Administration.manageUsers()).flashing("info" -> "User permissions updated")
          }
        }
  }

  /**
   * Sends a notification to a user
   */
  def sendNotification(currentPage: Int) = Authentication.authenticatedAction(parse.urlFormEncoded) {
    //There may be a better way to control the way the user is redirected than with an Integer...
    implicit request =>
      implicit user =>
        Authentication.enforcePermission("admin") {
          val id = request.body("userId")(0).toLong
          getUser(id) { targetUser =>

            // Send a notification to the user
            val message = request.body("message")(0)
            targetUser.sendNotification(message)
            if(currentPage == 0) {
              Redirect(routes.Administration.manageUsers()).flashing("info" -> "Notification sent to user")
            } else if (currentPage == 1) {
              Redirect(routes.Administration.manageCourses()).flashing("info" -> "Notification sent to user")
            } else {
              Redirect(routes.Application.home).flashing("info" -> "Notification sent to user")
            }
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
        Authentication.enforcePermission("admin") {
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
        Authentication.enforcePermission("admin") {
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
        Authentication.enforcePermission("admin") {
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
        Courses.getCourse(id) { course =>
          if (user.hasCoursePermission(course, "deleteCourse")) {
            course.delete()
            Redirect(routes.Application.home).flashing("info" -> "Course deleted")
          } else if(user.hasSitePermission("admin")) {
            course.delete()
            Redirect(routes.Administration.manageCourses()).flashing("info" -> "Course deleted")
          } else Errors.forbidden
      }
  }

  /**
   * The content management view
   */
  def manageContent = Authentication.authenticatedAction() {
    implicit request =>
      implicit user =>
        Authentication.enforcePermission("admin") {
          val content = Content.list
          Ok(views.html.admin.content(content, ResourceController.baseUrl))
        }
  }

  /**
   * Updates the settings of multiple content items
   */
  def batchUpdateContent = Authentication.authenticatedAction(parse.urlFormEncoded) {
    implicit request =>
      implicit user =>
        Authentication.enforcePermission("admin") {
          val redirect = Redirect(routes.Administration.manageContent())
          try {
            val params = request.body.mapValues(_(0))
            val shareability = params("shareability").toInt
            val visibility = params("visibility").toInt

            for(id <- params("ids").split(",") if !id.isEmpty;
                content <- Content.findById(id.toLong)) {
              content.copy(shareability = shareability, visibility = visibility).save
            }
            redirect.flashing("info" -> "Contents updated")
          } catch {
            case e: Throwable =>
              Logger.debug(e.getMessage())
              redirect.flashing("error" -> ("Error while updating: "+e.getMessage()))
          }
        }
  }

  /**
   * The home page content view
   */
  def homePageContent = Authentication.authenticatedAction() {
    implicit request =>
      implicit user =>
        Authentication.enforcePermission("admin") {
          Ok(views.html.admin.homePageContent())
        }
  }

  /**
   * Creates new home page content
   */
  def createHomePageContent = Authentication.authenticatedAction(parse.multipartFormData) {
    implicit request =>
      implicit user =>
        Authentication.enforcePermission("admin") {
          val redirect = Redirect(routes.Administration.homePageContent())
          try {
            val data = request.body.dataParts.mapValues(_(0))
            val homePageContent = HomePageContent(NotAssigned,
              data("title"),
              data("text"),
              data("link"),
              data("linkText"),
              data("background"),
              active = false
            )

            (if (data("background").isEmpty) {
              request.body.file("file").flatMap { file =>
                Await.result(FileUploader.uploadFile(file), Duration.Inf).map { url =>
                    homePageContent.copy(background = url)
                }
              }
            } else {
                Some(homePageContent)
            }) match {
              case Some(hpc) =>
                hpc.save
                redirect.flashing("info" -> "Home page content created")
              case None =>
                redirect.flashing("error" -> "Could not upload image")
            }
          } catch {
            case _ : Throwable =>
              redirect.flashing("error" -> "Failed to create home page content")
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
        Authentication.enforcePermission("admin") {

          HomePageContent.findById(id).map {
            homePageContent =>
              homePageContent.copy(active = !homePageContent.active).save
              val message =
                if (homePageContent.active) "no longer active."
                else "now active."
              Redirect(routes.Administration.homePageContent()).flashing("info" -> ("Home page content is " + message))
          }.getOrElse {
            Errors.notFound
          }
        }
  }

  /**
   * Deletes a particular home page content
   * @param id The ID of the home page content
   */
  def deleteHomePageContent(id: Long) = Authentication.authenticatedAction() {
    implicit request =>
      implicit user =>
        Authentication.enforcePermission("admin") {

          HomePageContent.findById(id).map {
            homePageContent =>
              homePageContent.delete()
              Redirect(routes.Administration.homePageContent()).flashing("info" -> "Home page content deleted")
          }.getOrElse {
            Errors.notFound
          }
        }
  }

  /**
   * The feedback view
   */
  def feedback = Authentication.authenticatedAction() {
    implicit request =>
      implicit user =>
        Authentication.enforcePermission("admin") {
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
        Authentication.enforcePermission("admin") {
          Feedback.findById(id).foreach(_.delete())
          Redirect(routes.Administration.feedback()).flashing("info" -> "Feedback deleted")
        }
  }

  /**
   * The site settings view
   */
  def siteSettings = Authentication.authenticatedAction() {
    implicit request =>
      implicit user =>
        Authentication.enforcePermission("admin") {
          Ok(views.html.admin.settings(Setting.list))
        }
  }

  /**
   * Saves and updates the site settings
   */
  def saveSiteSettings = Authentication.authenticatedAction(parse.urlFormEncoded) {
    implicit request =>
      implicit user =>
        Authentication.enforcePermission("admin") {
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
        Authentication.enforcePermission("admin") {

          User.findById(id) match {
          case Some(proxyUser) =>
            Redirect(routes.Application.home()).withSession("userId" -> id.toString)
              .flashing("info" -> ("You are now using the site as " + proxyUser.displayName + ". To end proxy you must log out then back in with your normal account."))
          case _ =>
            Redirect(routes.Application.home())
              .flashing("info" -> ("Requested Proxy User Not Found"))
          }
        }
  }
}
