package controllers

import play.api.mvc.{Action, Controller, Result, ResponseHeader}
import service.{TimeTools, MobileDetection, LMSAuth}
import play.core.parsers.FormUrlEncodedParser
import controllers.authentication.Authentication
import play.api.Play
import play.api.Play.current
import scala.concurrent._
import ExecutionContext.Implicits.global
import models.ContentListing
import dataAccess.ResourceController
import play.api.libs.iteratee.Enumerator

/**
 * A controller which deals with content in the context of a course
 */
object CourseContent extends Controller {

  /**
   * Content view in course page
   */
  def viewInCourse(id: Long, courseId: Long) = Authentication.authenticatedAction() {
    implicit request =>
      implicit user =>
        ContentController.getContent(id) { content =>
          Courses.getCourse(courseId) { course =>
            Future {
              // Check that the user can view the content
              if (content isVisibleBy user) Ok(
                if(request.queryString.get("embed").flatMap(_.lift(0)).exists(_.toBoolean)){
                  views.html.content.share.embed(content, ResourceController.baseUrl, Some(user), Some(course))
                } else if (MobileDetection.isMobile()) {
                  views.html.content.viewMobile(content, ResourceController.baseUrl, Some(user), Some(course))
                } else {
                  views.html.content.view(content, ResourceController.baseUrl, Some(user), Some(course))
                }
              ) else
                Errors.forbidden
            }
          }
        }
  }

  /**
   * Content view page from an LMS
   */
  def ltiAccess(id: Long, courseId: Long) = Action.async(parse.tolerantText) {
    implicit request =>
      ContentController.getContent(id) { content =>
        Courses.getCourse(courseId) { course =>
          Future {
            LMSAuth.ltiCourseAuth(course) match {
            case Some(user) => Ok(
              if(request.queryString.get("embed").flatMap(_.lift(0)).exists(_.toBoolean)){
                views.html.content.share.embed(content, ResourceController.baseUrl, Some(user), Some(course))
              } else if (MobileDetection.isMobile()) {
                views.html.content.viewMobile(content, ResourceController.baseUrl, Some(user), Some(course))
              } else {
                views.html.content.view(content, ResourceController.baseUrl, Some(user), Some(course))
              }
            )
            case _ =>
              Errors.forbidden
            }
          }
        }
      }
  }

  /**
   * Adds a particular content object to a course
   * @param id The ID of the content
   */
  def addToCourse(id: Long) = Authentication.authenticatedAction(parse.urlFormEncoded) {
    implicit request =>
      implicit user =>
        val courseId = request.body("course")(0).toLong
        Courses.getCourse(courseId) { course =>
          if (user.hasCoursePermission(course, "addContent")) {
            ContentController.getContent(id) { content =>
              course.addContent(content)
              val courseLink = "<a href=\"" + routes.Courses.view(course.id.get).toString() + "\">" + course.name + "</a>"
              Future {
                Redirect(routes.CourseContent.viewInCourse(content.id.get, course.id.get))
                  .flashing("success" -> ("Content added to course " + courseLink))
              }
            }
          } else
            Future(Errors.forbidden)
        }
  }

  /**
   * Removes a particular content object from a course
   * @param id The ID of the content
   * @param courseId The ID of the course
   */
  def removeFromCourse(id: Long, courseId: Long) = Authentication.authenticatedAction() {
    implicit request =>
      implicit user =>
        Courses.getCourse(courseId) { course =>
          if (user.hasCoursePermission(course, "removeContent")) {
            ContentController.getContent(id) { content =>
              ContentListing.listByContent(content).find(_.courseId == courseId).map(_.delete())
              Future { 
                Redirect(routes.Courses.view(courseId))
                  .flashing("info" -> "Content removed")
              }
            }
          } else
              Future(Errors.forbidden)
        }
  }
}