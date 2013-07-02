package controllers

import play.api.mvc.{Action, Controller}
import service.{TimeTools, MobileDetection, ExcelWriter, LMSAuth}
import play.core.parsers.FormUrlEncodedParser
import controllers.authentication.Authentication
import play.api.Play
import play.api.Play.current
import scala.concurrent.ExecutionContext
import ExecutionContext.Implicits.global
import models.ContentListing
import dataAccess.ResourceController

/**
 * Created with IntelliJ IDEA.
 * User: camman3d
 * Date: 5/8/13
 * Time: 1:32 PM
 * To change this template use File | Settings | File Templates.
 */
object CourseContent extends Controller {

  /**
   * Content view page from an LMS
   */
  def viewLms(id: Long, courseId: Long) = Action(parse.tolerantText) {
    implicit request =>
      ContentController.getContent(id) {
        content =>
          Courses.getCourse(courseId) {
            course =>
              val user = LMSAuth.ltiAuth(course)
              if (user.isDefined) {
                // Get the custom parameters
                val query = FormUrlEncodedParser.parse(request.body, request.charset.getOrElse("utf-8"))
                  .filterKeys(_.startsWith("custom")).map(d => (d._1.substring(7), d._2))
                user.get.copy(lastLogin = TimeTools.now()).save
                Redirect(routes.CourseContent.viewInCourse(id, courseId).toString(), query)
                  .withSession("userId" -> user.get.id.get.toString)
              } else
                Errors.forbidden
          }
      }
  }

  /**
   * Content stats page within a course
   */
  def statsInCourse(id: Long, courseId: Long) = Authentication.authenticatedAction() {
    implicit request =>
      implicit user =>
        ContentController.getContent(id) {
          content =>
            Courses.getCourse(courseId) {
              course =>

              // Only teachers can view stats
                if (user canEdit course) {
                  Ok(views.html.content.stats(content, ResourceController.baseUrl, Some(course)))
                } else
                  Errors.forbidden
            }
        }
  }

  def downloadStatsInCourse(id: Long, courseId: Long) = Authentication.authenticatedAction() {
    implicit request =>
      implicit user =>
        ContentController.getContent(id) {
          content =>
            Courses.getCourse(courseId) {
              course =>

              // Only teachers can view stats
                if (user canEdit course) {
                  val coursePrefix = "course_" + course.id.get + ":"
                  val activity = content.getActivity(coursePrefix)
                  Async {
                    ExcelWriter.writeActivity(activity).map {
                      url =>
                        Redirect(url)
                    }
                  }
                } else
                  Errors.forbidden
            }
        }
  }

  def clearStatsInCourse(id: Long, courseId: Long) = Authentication.authenticatedAction() {
    implicit request =>
      implicit user =>
        ContentController.getContent(id) {
          content =>
            Courses.getCourse(courseId) {
              course =>

              // Only teachers can clear stats
                if (user canEdit course) {
                  val coursePrefix = "course_" + course.id.get + ":"
                  content.getActivity(coursePrefix).foreach(_.delete())
                  Redirect(routes.CourseContent.statsInCourse(content.id.get, course.id.get))
                    .flashing("info" -> "Data cleared")
                } else
                  Errors.forbidden
            }
        }
  }

  /**
   * Content view in course page
   */
  def viewInCourse(id: Long, courseId: Long) = Authentication.authenticatedAction() {
    implicit request =>
      implicit user =>
        ContentController.getContent(id) {
          content =>
            Courses.getCourse(courseId) {
              course =>

              // Check that the user can view the content
                if (content isVisibleBy user) {
                  if (MobileDetection.isMobile())
                    Ok(views.html.content.viewMobile(content, ResourceController.baseUrl, Some(course)))
                  else
                    Ok(views.html.content.view(content, ResourceController.baseUrl, Some(course)))
                } else
                  Errors.forbidden
            }
        }
  }

  def addToCourse(id: Long) = Authentication.authenticatedAction(parse.urlFormEncoded) {
    implicit request =>
      implicit user =>
        ContentController.getContent(id) {
          content =>

            val courseId = request.body("course")(0).toLong
            Courses.getCourse(courseId) {
              course =>

              // Make sure the user is allowed to edit the course
                if (user canEdit course) {
                  course.addContent(content)
                  val courseLink = "<a href=\"" + routes.Courses.view(course.id.get).toString() + "\">" + course.name + "</a>"
                  Redirect(routes.CourseContent.viewInCourse(content.id.get, course.id.get))
                    .flashing("success" -> ("Content added to course " + courseLink))
                } else
                  Errors.forbidden
            }
        }
  }

  def removeFromCourse(id: Long, courseId: Long) = Authentication.authenticatedAction() {
    implicit request =>
      implicit user =>
        ContentController.getContent(id) {
          content =>
            Courses.getCourse(courseId) {
              course =>

                // Make user the user is allowed to do this
                if (user canEdit course) {
                  ContentListing.listByContent(content).find(_.courseId == courseId).map(_.delete())
                  Redirect(routes.Courses.view(courseId)).flashing("info" -> "Content removed")
                } else
                  Errors.forbidden
            }
        }
  }

}
