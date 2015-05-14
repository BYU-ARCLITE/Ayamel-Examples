package controllers

import authentication.Authentication
import play.api.mvc._
import models._
import service.{TimeTools, LMSAuth}
import anorm.NotAssigned

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
    Course.findById(id).map( course => f(course) ).getOrElse(Errors.notFound)
  }

  /**
   * Returns the XML LTI configuration for a particular course
   * @param id The ID of the course
   */
  def ltiConfiguration(id: Long) = Action {
    implicit request =>
      getCourse(id) { course =>
        val xml = <cartridge_basiclti_link xmlns="http://www.imsglobal.org/xsd/imslticc_v1p0" xmlns:blti="http://www.imsglobal.org/xsd/imsbasiclti_v1p0" xmlns:lticm="http://www.imsglobal.org/xsd/imslticm_v1p0" xmlns:lticp="http://www.imsglobal.org/xsd/imslticp_v1p0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.imsglobal.org/xsd/imslticc_v1p0 http://www.imsglobal.org/xsd/lti/ltiv1p0/imslticc_v1p0.xsd http://www.imsglobal.org/xsd/imsbasiclti_v1p0 http://www.imsglobal.org/xsd/lti/ltiv1p0/imsbasiclti_v1p0.xsd http://www.imsglobal.org/xsd/imslticm_v1p0 http://www.imsglobal.org/xsd/lti/ltiv1p0/imslticm_v1p0.xsd http://www.imsglobal.org/xsd/imslticp_v1p0 http://www.imsglobal.org/xsd/lti/ltiv1p0/imslticp_v1p0.xsd">
          <blti:title>
            {course.name}
            on Ayamel</blti:title>
          <blti:description>
            This provides access to the course "
            {course.name}
            " on Ayamel where students are able to watch videos,
            look at images, and listen to audio to learn languages.
          </blti:description>
          <blti:icon>
            {routes.Assets.at("images/lti/icon.png")}
          </blti:icon>
          <blti:launch_url>
            {routes.Courses.ltiAuth(course.id.get).absoluteURL()}
          </blti:launch_url>
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
      getCourse(id) { course =>
        LMSAuth.ltiAuth(course) match {
        case Some(user) => {
            user.copy(lastLogin = TimeTools.now()).save
            Redirect(routes.Courses.view(id)).withSession("userId" -> user.id.get.toString)
          }
        case _ =>
          Errors.forbidden
        }
      }
  }

  /**
   * The key-based authentication page. Redirects to the course page if successful.
   */
  def keyAuth(id: Long) = Action {
    implicit request =>
      getCourse(id) { course =>
        LMSAuth.keyAuth(course) match {
        case Some(user) =>
          Redirect(routes.Courses.view(id)).withSession("userId" -> user.id.get.toString)
        case _ =>
          Errors.forbidden
        }
      }
  }

  /**
   * The course page.
   */
  def view(id: Long) = Authentication.authenticatedAction() {
    implicit request =>
      implicit user =>
        getCourse(id) { course =>
          // TODO: Once the users get the "viewCourse" permission, use
          //       if (user.hasCoursePermission(course, "viewCourse")) instead
          if (course.getMembers.contains(user) ||  SitePermissions.userHasPermission(user, "admin"))
            Ok(views.html.courses.view(course))
          else
            Redirect(routes.Courses.courseRequestPage(id))
        }
  }

  /**
   * Edit course information
   */
  def edit(id: Long) = Authentication.authenticatedAction(parse.urlFormEncoded) {
    implicit request =>
      implicit user =>
        getCourse(id) { course =>
          if (user.hasCoursePermission(course, "editCourse")) {
            val name = request.body("courseName")(0)
            val enrollment = Symbol(request.body("courseEnrollment")(0))
            course.copy(name = name, enrollment = enrollment).save
            Redirect(routes.Courses.view(id)).flashing("info" -> "Course updated")
          } else
            Errors.forbidden
        }
  }

  /**
   * Add the content(s) to a specified course.
   * @param id The ID of the course
   */
  def addContent(id: Long) = Authentication.authenticatedAction(parse.multipartFormData) {
    implicit request =>
      implicit user =>
        getCourse(id) { course =>
          // Only non-guest members and admins can add content
          if (user.hasCoursePermission(course, "addContent")) {

            // Add the content to the course
            request.body.dataParts("addContent").foreach { id =>
              Content.findById(id.toLong).foreach(content => course.addContent(content))
            }
            Redirect(routes.Courses.view(id)).flashing("success" -> "Content added to course.")
          } else
            Errors.forbidden
        }
  }

  /**
   * Remove the content(s) from a specified course.
   * @param id The ID of the course
   */
  def removeContent(id: Long) = Authentication.authenticatedAction(parse.urlFormEncoded) {
    implicit request =>
      implicit user =>
        getCourse(id) { course =>

          // Only non-guest members and admins can remove content
          if (user.hasCoursePermission(course, "removeContent")) {

            // Remove the content to the course
            request.body("removeContent").foreach(id => {
              Content.findById(id.toLong).foreach(content => course.removeContent(content))
            })
            Redirect(routes.Courses.view(id)).flashing("success" -> "Content removed from course.")
          } else
            Errors.forbidden
        }
  }

  /**
   * Makes an announcement in a course
   * @param id The ID of the course
   */
  def addAnnouncement(id: Long) = Authentication.authenticatedAction(parse.urlFormEncoded) {
    implicit request =>
      implicit user =>
        getCourse(id) { course =>

          // Only non-guest members and admins can add content
          if (user.hasCoursePermission(course, "addContent")) {

            // Add the content to the course
            val announcement = request.body("announcement")(0)
            course.makeAnnouncement(user, announcement)
            Redirect(routes.Courses.view(id)).flashing("success" -> "Announcement published.")
          } else
            Errors.forbidden
      }
  }

  /**
   * Creates a new course
   */
  def create = Authentication.authenticatedAction(parse.urlFormEncoded) {
    request =>
      user =>

        // Check if the user is allowed to create a course
        if (user.hasSitePermission("createCourse")) {

          // Collect info
          val courseName = request.body("courseName")(0)
          val enrollment = Symbol(request.body("enrollment")(0))

          // Create the course
          val course = Course(NotAssigned, courseName, "", "", enrollment).save
          user.enroll(course, teacher = true)

          // Redirect to the course page
          Redirect(routes.Courses.view(course.id.get)).flashing("success" -> "Course Added")
        } else
          Errors.forbidden
  }

  /**
   * The create a new course view
   */
  def createPage = Authentication.authenticatedAction() {
    implicit request =>
      implicit user =>

      // Check if the user is allowed to create a course
        if (user.hasSitePermission("createCourse"))
          Ok(views.html.courses.create())
        else
          Errors.forbidden
  }

  /**
   * Lists all the courses
   */
  def list = Authentication.authenticatedAction() {
    implicit request =>
      implicit user =>
        Authentication.enforcePermission("joinCourse") {
          Ok(views.html.courses.list(Course.list))
        }
  }

  /**
   * The student join course request page
   * @param id The ID of the course
   */
  def courseRequestPage(id: Long) = Authentication.authenticatedAction() {
    implicit request =>
      implicit user =>
        Authentication.enforcePermission("joinCourse") {
          getCourse(id) { course =>
            if(course.getMembers.contains(user)) {  // Make sure the user isn't already in the course
              Redirect(routes.Courses.view(id)).flashing("error" -> "You are already in this course")
            } else {
              AddCourseRequest.listByCourse(course).find(req => req.userId == user.id.get) match {
              case Some(_) => Ok(views.html.courses.pending(course))
              case _ => Ok(views.html.courses.request(course))
              }
            }
          }
        }
  }

  /**
   * Submits the student's join course request
   * @param id The ID of the course
   */
  def submitCourseRequest(id: Long) = Authentication.authenticatedAction(parse.urlFormEncoded) {
    implicit request =>
      implicit user =>
        Authentication.enforcePermission("joinCourse") {
          getCourse(id) { course =>

            // Check to see what kind of enrollment the course is
            if (course.enrollment == 'closed) {

              val message = request.body("message")(0)
              AddCourseRequest(NotAssigned, user.id.get, course.id.get, message).save

              // Notify the teachers
              val notificationMessage = "A student has requested to join your course \"" + course.name + "\"."
              course.getTeachers.foreach {
                _.sendNotification(notificationMessage)
              }

              Ok(views.html.courses.pending(course))
            } else if (course.enrollment == 'open) {

              // Notify the teachers
              val notificationMessage = "A student has joined your course \"" + course.name + "\"."
              course.getTeachers.foreach {
                _.sendNotification(notificationMessage)
              }

              user.enroll(course, teacher = false)
              Redirect(routes.Courses.view(course.id.get))
            } else {
              Redirect(routes.Application.home()).flashing("error" -> "Error: Unknown course enrollment type")
            }
          }
        }
  }

  /**
   * The view where teachers approve student join requests
   * @param id The ID of the course
   */
  def approvePage(id: Long) = Authentication.authenticatedAction() {
    implicit request =>
      implicit user =>
        getCourse(id) { course =>
          if (user.hasCoursePermission(course, "addStudent"))
            Ok(views.html.courses.approveRequests(course))
          else
            Errors.forbidden
        }
  }

  /**
   * Approves a certain join request
   * @param courseId The ID of the course
   */
  def approveRequest(courseId: Long) = Authentication.authenticatedAction(parse.urlFormEncoded) {
    implicit request =>
      implicit user =>
        if (user.hasCoursePermission(Course.findById(courseId).get, "addStudent")) {
            for( id <- request.body("reqid");
                 req <- AddCourseRequest.findById(id.toLong);
                 if req.courseId == courseId
            ) { req.approve() }
            Ok
        } else
            Errors.forbidden
  }

  /**
   * Denies a particular join request
   * @param courseId The ID of the course
   */
  def denyRequest(courseId: Long) = Authentication.authenticatedAction(parse.urlFormEncoded) {
    implicit request =>
      implicit user =>
        if (user.hasCoursePermission(Course.findById(courseId).get, "addStudent")) {
            for( id <- request.body("reqid");
                 req <- AddCourseRequest.findById(id.toLong);
                 if req.courseId == courseId
            ) { req.deny() }
            Ok
        } else
            Errors.forbidden
  }

  /**
   * Remove a student from a course
   * @param id The ID of the course
   * @param studentId The user ID of the student
   */
  def removeStudent(id: Long, studentId: Long) = Authentication.authenticatedAction() {
    implicit request =>
      implicit user =>
        getCourse(id) { course =>
          if (user.hasCoursePermission(course, "removeStudent")) {
            User.findById(studentId) match {
            case Some(student) =>
              student.unenroll(course)
              Redirect(routes.Courses.view(course.id.get)).flashing("info" -> "Student removed")
            case _ =>
              Errors.notFound
            }
          } else
            Errors.forbidden
        }
  }

  /**
   * Give permissions to a user
   */
  def setPermission(id: Long) = Authentication.authenticatedAction(parse.multipartFormData) {
    implicit request =>
      implicit user =>
        //Authentication.enforcePermission("admin") {
            val data = request.body.dataParts
            getCourse(id) { course =>
              User.findById(data("userId")(0).toLong) match {
              case Some(user) =>
                data("permission").foreach { permission =>
                  user.addCoursePermission(course, permission)
                }
                Redirect(routes.Courses.view(course.id.get)).flashing("info" -> "User permissions updated")
              case None =>
                Redirect(routes.Courses.view(course.id.get)).flashing("error" -> "User not found")
              }
            }
        //}
  }

  /**
   * Teachers can share a link with student which, when visited, will cause the user to join the course.
   * This has an authenticated action so if the user doesn't have an account, as I imagine most students won't, they
   * will be redirected to the login page where they can create an account or login via a service and then be taken to
   * this join page.
   * @param id The ID of the course to join
   */
  def joinLink(id: Long, key: String) = Authentication.authenticatedAction() {
    implicit request =>
      implicit user =>
        getCourse(id) { course =>
          if(course.getMembers.contains(user)) {  // Make sure the user isn't already in the course
            Redirect(routes.Courses.view(id)).flashing("error" -> "You are already in this course")
          } else if (key == course.lmsKey) {
            user.enroll(course)
            Redirect(routes.Courses.view(id)).flashing("info" -> ("Welcome to the course \"" + course.name + "\"."))
          } else {
            Unauthorized("Invalid key")
          }
        }
  }
}
