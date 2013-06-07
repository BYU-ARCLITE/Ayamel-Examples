package controllers

import authentication.Authentication
import play.api.mvc._
import models.{AddCourseRequest, User, Content, Course}
import service.{TimeTools, LMSAuth}
import anorm.NotAssigned
import play.core.parsers.FormUrlEncodedParser

/**
 * This controller manages all the pages relating to courses, including authentication.
 */
object Courses extends Controller {

  /**
   * Gets the course. A mix-in for action composition.
   * @param id The id of the course
   * @param f The action body. Returns a result
   * @param request The implicit http request
   * @return A result
   */
  def getCourse(id: Long)(f: Course => Result)(implicit request: Request[_]): Result = {
    val course = Course.findById(id)
    if (course.isDefined)
      f(course.get)
    else
      Errors.notFound
  }

  def ltiConfiguration(id: Long) = Action {
    implicit request =>
      getCourse(id) {
        course =>
          val xml = <cartridge_basiclti_link xmlns="http://www.imsglobal.org/xsd/imslticc_v1p0" xmlns:blti="http://www.imsglobal.org/xsd/imsbasiclti_v1p0" xmlns:lticm="http://www.imsglobal.org/xsd/imslticm_v1p0" xmlns:lticp="http://www.imsglobal.org/xsd/imslticp_v1p0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.imsglobal.org/xsd/imslticc_v1p0 http://www.imsglobal.org/xsd/lti/ltiv1p0/imslticc_v1p0.xsd http://www.imsglobal.org/xsd/imsbasiclti_v1p0 http://www.imsglobal.org/xsd/lti/ltiv1p0/imsbasiclti_v1p0.xsd http://www.imsglobal.org/xsd/imslticm_v1p0 http://www.imsglobal.org/xsd/lti/ltiv1p0/imslticm_v1p0.xsd http://www.imsglobal.org/xsd/imslticp_v1p0 http://www.imsglobal.org/xsd/lti/ltiv1p0/imslticp_v1p0.xsd">
            <blti:title>{course.name} on Ayamel</blti:title>
            <blti:description>
              This provides access to the course "{course.name}" on Ayamel where students are able to watch videos,
              look at images, and listen to audio to learn languages.
            </blti:description>
            <blti:icon>{routes.Assets.at("images/lti/icon.png")}</blti:icon>
            <blti:launch_url>{routes.Courses.ltiAuth(course.id.get).absoluteURL()}</blti:launch_url>
            <blti:extensions platform="canvas.instructure.com">
              <lticm:property name="tool_id">Ayamel</lticm:property>
              <lticm:property name="privacy_level">public</lticm:property>
            </blti:extensions>
            <cartridge_bundle identifierref="BLTI001_Bundle"/>
            <cartridge_icon identifierref="BLTI001_Icon"/>
          </cartridge_basiclti_link>
          Ok(xml)
      }
  }


  /**
   * The lti authentication page. Redirects to the course page if successful.
   */
  def ltiAuth(id: Long) = Action(parse.tolerantText) {
    implicit request =>
      getCourse(id) {
        course =>
          val user = LMSAuth.ltiAuth(course)
          if (user.isDefined) {
            user.get.copy(lastLogin = TimeTools.now()).save
            Redirect(routes.Courses.view(id)).withSession("userId" -> user.get.id.get.toString)
          } else
            Errors.forbidden
      }
  }

  /**
   * The key-based authentication page. Redirects to the course page if successful.
   */
  def keyAuth(id: Long) = Action {
    implicit request =>
      getCourse(id) {
        course =>
          val user = LMSAuth.keyAuth(course)
          if (user.isDefined)
            Redirect(routes.Courses.view(id)).withSession("userId" -> user.get.id.get.toString)
          else
            Errors.forbidden
      }
  }

  /**
   * The course page.
   */
  def view(id: Long) = Authentication.authenticatedAction() {
    implicit request =>
      implicit user =>
        getCourse(id) {
          course =>
            if (user canView course)
              Ok(views.html.courses.view(course))
            else
              Redirect(routes.Courses.courseRequestPage(id))
        }
  }

  def addContent(id: Long) = Authentication.authenticatedAction(parse.urlFormEncoded) {
    implicit request =>
      implicit user =>
        getCourse(id) {
          course =>

          // Only non-guest members and admins can add content
            if (user canAddContentTo course) {

              // Add the content to the course
              val contentId = request.body("addContent")(0).toLong
              val content = Content.findById(contentId)
              if (content.isDefined) {
                course.addContent(content.get)
                Redirect(routes.Courses.view(id)).flashing("success" -> "Content added to course.")
              } else
                Errors.notFound
            } else
              Errors.forbidden
        }
  }

  def addAnnouncement(id: Long) = Authentication.authenticatedAction(parse.urlFormEncoded) {
    implicit request =>
      implicit user =>
        getCourse(id) {
          course =>

          // Only non-guest members and admins can add content
            if (user canAddContentTo course) {

              // Add the content to the course
              val announcement = request.body("announcement")(0)
              course.makeAnnouncement(user, announcement)
              Redirect(routes.Courses.view(id)).flashing("success" -> "Announcement published.")
            } else
              Errors.forbidden
        }
  }

  def create = Authentication.authenticatedAction(parse.urlFormEncoded) {
    request =>
      user =>

      // Check if the user is allowed to create a course
        if (user.canCreateCourse) {

          // Collect info
          val courseName = request.body("courseName")(0)
//          val startDate = request.body("startDate")(0)
//          val endDate = request.body("endDate")(0)
          val enrollment = Symbol(request.body("enrollment")(0))

          // Create the course
          val course = Course(NotAssigned, courseName, "", "", enrollment).save
          user.enroll(course, teacher = true)

          // Redirect to the course page
          Redirect(routes.Courses.view(course.id.get)).flashing("success" -> "Course Added")
        } else
          Errors.forbidden
  }

  def createPage = Authentication.authenticatedAction() {
    implicit request =>
      implicit user =>

      // Check if the user is allowed to create a course
        if (user.canCreateCourse)
          Ok(views.html.courses.create())
        else
          Errors.forbidden
  }

  def list = Authentication.authenticatedAction() {
    implicit request =>
      implicit user =>

      // Guests cannot browse
        Authentication.enforceNotRole(User.roles.guest) {
          val courses = Course.list
          Ok(views.html.courses.list(courses))
        }
  }

  def courseRequestPage(id: Long) = Authentication.authenticatedAction() {
    implicit request =>
      implicit user =>
        getCourse(id) {
          course =>

            // Guests cannot request courses
            Authentication.enforceNotRole(User.roles.guest) {
              val findRequest = AddCourseRequest.listByCourse(course).find(req => req.userId == user.id.get)
              if (findRequest.isDefined)
                Ok(views.html.courses.pending(course))
              else
                Ok(views.html.courses.request(course))
            }
        }
  }

  def submitCourseRequest(id: Long) = Authentication.authenticatedAction(parse.urlFormEncoded) {
    implicit request =>
      implicit user =>
        getCourse(id) {
          course =>

            // Make sure it's not a guest
            Authentication.enforceNotRole(User.roles.guest) {

              // Check to see what kind of enrollment the course is
              if (course.enrollment == 'closed) {

                val message = request.body("message")(0)
                AddCourseRequest(NotAssigned, user.id.get, course.id.get, message).save

                // Notify the teachers
                val notificationMessage = "A student has requested to join your course \"" + course.name + "\"."
                course.getTeachers.foreach { _.sendNotification(notificationMessage)}

                Ok(views.html.courses.pending(course))
              } else if (course.enrollment == 'open) {

                // Notify the teachers
                val notificationMessage = "A student has joined your course \"" + course.name + "\"."
                course.getTeachers.foreach { _.sendNotification(notificationMessage)}

                user.enroll(course, teacher = false)
                Redirect(routes.Courses.view(course.id.get))
              } else {
                Redirect(routes.Application.home()).flashing("error" -> "Error: Unknown course enrollment type")
              }
            }
        }
  }

  def approvePage(id: Long) = Authentication.authenticatedAction() {
    implicit request =>
      implicit user =>
        getCourse(id) {
          course =>

            if (user canEdit course)
              Ok(views.html.courses.approveRequests(course))
            else
              Errors.forbidden
        }
  }

  def approveRequest(id: Long, requestId: Long) = Authentication.authenticatedAction() {
    implicit request =>
      implicit user =>
        getCourse(id) {
          course =>

            // Get the request
            val courseRequest = AddCourseRequest.findById(requestId)
            if (courseRequest.isDefined) {

              // Make sure the user is allowed to approve
              if(user.canApprove(courseRequest.get, course)) {
                courseRequest.get.approve()
                Redirect(routes.Courses.approvePage(course.id.get)).flashing("info" -> "Course request approved")
              } else
                Errors.forbidden
            } else
              Errors.notFound
        }
  }

  def denyRequest(id: Long, requestId: Long) = Authentication.authenticatedAction() {
    implicit request =>
      implicit user =>
        getCourse(id) {
          course =>

            // Get the request
            val courseRequest = AddCourseRequest.findById(requestId)
            if (courseRequest.isDefined) {

              // Make sure the user is allowed to approve
              if(user.canApprove(courseRequest.get, course)) {
                courseRequest.get.deny()
                Redirect(routes.Courses.approvePage(course.id.get)).flashing("info" -> "Course request denied")
              } else
                Errors.forbidden
            } else
              Errors.notFound
        }
  }


}
