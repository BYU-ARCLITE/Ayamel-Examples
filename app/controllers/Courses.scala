package controllers

import scala.concurrent._
import ExecutionContext.Implicits.global
import authentication.Authentication
import play.api.mvc._
import play.api.Play.current
import models._
import service.{TimeTools, LMSAuth}

/**
 * This controller manages all the pages relating to courses, including authentication.
 */
object Courses extends Controller {

  val isHTTPS = current.configuration.getBoolean("HTTPS").getOrElse(false)

  /**
   * Gets the course. A mix-in for action composition.
   * @param id The id of the course
   * @param f The action body. Returns a result
   * @param request The implicit http request
   * @return A result
   */
  def getCourse(id: Long)(f: Course => Future[Result])(implicit request: Request[_]): Future[Result] = {
    Course.findById(id).map(course => f(course))
	  .getOrElse(Future(Errors.notFound))
  }

  /**
   * Returns the XML LTI configuration for a particular course
   * @param id The ID of the course
   */
  def ltiConfiguration(id: Long) = Action.async {
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
            {routes.Courses.ltiAuth(course.id.get).absoluteURL(isHTTPS)}
          </blti:launch_url>
          <blti:extensions platform="canvas.instructure.com">
            <lticm:property name="tool_id">Ayamel</lticm:property>
            <lticm:property name="privacy_level">public</lticm:property>
          </blti:extensions>
          <cartridge_bundle identifierref="BLTI001_Bundle"/>
          <cartridge_icon identifierref="BLTI001_Icon"/>
        </cartridge_basiclti_link>
        Future(Ok(xml))
      }
  }


  /**
   * The lti authentication page. Redirects to the course page if successful.
   */
  def ltiAuth(id: Long) = Action.async(parse.tolerantText) {
    implicit request =>
      getCourse(id) { course =>
	    Future {
          LMSAuth.ltiCourseAuth(course) match {
          case Some(user) =>
            Redirect(routes.Courses.view(id))
              .withSession("userId" -> user.id.get.toString)
          case _ =>
            Errors.forbidden
		  }
        }
      }
  }

  /**
   * The key-based authentication page. Redirects to the course page if successful.
   */
  def keyAuth(id: Long) = Action.async {
    implicit request =>
      getCourse(id) { course =>
	    Future {
          LMSAuth.keyAuth(course) match {
          case Some(user) =>
            Redirect(routes.Courses.view(id))
		      .withSession("userId" -> user.id.get.toString)
          case _ =>
            Errors.forbidden
          }
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
		  Future {
            // TODO: Once the users get the "viewCourse" permission, use
            // if (user.hasCoursePermission(course, "viewCourse")) instead
            if (course.getMembers.contains(user) ||  SitePermissions.userHasPermission(user, "admin"))
              Ok(views.html.courses.view(course))
            else
              Redirect(routes.Courses.courseRequestPage(id))
          }
		}
  }

  /**
   * Edit course information
   */
  def edit(id: Long) = Authentication.authenticatedAction(parse.urlFormEncoded) {
    implicit request =>
      implicit user =>
        getCourse(id) { course =>
		  Future {
            if (user.hasCoursePermission(course, "editCourse")) {
              val name = request.body("name")(0)
              val enrollment = Symbol(request.body("enrollment")(0))
              val featured = if (SitePermissions.userHasPermission(user, "admin")){
                request.body("status")(0) == "featured"
              } else { course.featured }
              course.copy(name = name, enrollment = enrollment, featured = featured).save
              Redirect(routes.Courses.view(id)).flashing("info" -> "Course updated")
            } else
              Errors.forbidden
          }
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
		  Future {
            // Only non-guest members and admins can add content
            if (user.hasCoursePermission(course, "addContent")) {

              for ( // Add the content to the course
			    id <- request.body.dataParts("addContent");
				content <- Content.findById(id.toLong)
			  ) { course.addContent(content) }

              Redirect(routes.Courses.view(id))
			    .flashing("success" -> "Content added to course.")
            } else
              Errors.forbidden
		  }
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
          Future {
            // Only non-guest members and admins can remove content
            if (user.hasCoursePermission(course, "removeContent")) {

              for ( // Remove the content to the course
	            id <- request.body("removeContent");
			    content <- Content.findById(id.toLong)
			  ) { course.removeContent(content) }

              Redirect(routes.Courses.view(id))
	            .flashing("success" -> "Content removed from course.")
            } else
              Errors.forbidden
		  }
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
          Future {
            // Only non-guest members and admins can add content
            if (user.hasCoursePermission(course, "makeAnnouncement")) {
              // Add the content to the course
              val announcement = request.body("announcement")(0)
              if (announcement.getBytes("UTF-8").length < 65534) { //2^16-2: max length of MySQL Text
                course.makeAnnouncement(user, announcement)
                Redirect(routes.Courses.view(id))
				  .flashing("success" -> "Announcement published.")
              } else {
                Redirect(routes.Courses.view(id))
				  .flashing("error" -> "Announcement text was too long.")
              }
            } else
              Errors.forbidden
		  }
      }
  }

  /**
   * Deletes an announcement
   * @param id The ID of the course
   */
  def deleteAnnouncement(courseId: Long) = Authentication.authenticatedAction(parse.urlFormEncoded) {
    implicit request =>
      implicit user =>
        getCourse(courseId) { course =>
		  Future {
            if (user.hasCoursePermission(course, "makeAnnouncement")) {
              val announcementId = request.body("announcementId")(0).toLong
              Announcement.deleteAnnouncement(announcementId, courseId)
              Redirect(routes.Courses.view(courseId))
			    .flashing("success" -> "Announcement deleted")
            } else
              Errors.forbidden
		  }
        }
  }

  /**
   * Creates a new course
   */
  def create = Authentication.authenticatedAction(parse.urlFormEncoded) {
    request =>
      user =>
        Future {
          // Check if the user is allowed to create a course
          if (user.hasSitePermission("createCourse")) {

            // Collect info
            val courseName = request.body("courseName")(0)
            val enrollment = Symbol(request.body("enrollment")(0))

            // Create the course
            val course = Course(None, courseName, "", "", enrollment).save
            user.enroll(course, teacher = true)

            // Redirect to the course page
            Redirect(routes.Courses.view(course.id.get)).flashing("success" -> "Course Added")
          } else
          Errors.forbidden
		}
  }

  /**
   * The create a new course view
   */
  def createPage = Authentication.authenticatedAction() {
    implicit request =>
      implicit user =>

        // Check if the user is allowed to create a course
        Future {
		  if (user.hasSitePermission("createCourse"))
            Ok(views.html.courses.create())
          else
            Errors.forbidden
		}
  }

  /**
   * Lists all the courses
   */
  def list = Authentication.authenticatedAction() {
    implicit request =>
      implicit user =>
        Authentication.enforcePermission("joinCourse") {
          Future(Ok(views.html.courses.list(Course.list)))
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
		    Future {
              if(course.getMembers.contains(user)) { // Make sure the user isn't already in the course
                Redirect(routes.Courses.view(id))
	              .flashing("error" -> "You are already in this course")
              } else {
                AddCourseRequest.listByCourse(course)
			      .find(req => req.userId == user.id.get)
                  .map { _ => Ok(views.html.courses.pending(course)) }
				  .getOrElse {
                    if (course.enrollment == 'open)
                      Ok(views.html.courses.view(course))
                    else
                      Ok(views.html.courses.request(course))
			      }
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
		    Future {

              // Check to see what kind of enrollment the course is
              if (course.enrollment == 'closed) {

                val message = request.body("message")(0)
                AddCourseRequest(None, user.id.get, course.id.get, message).save

                // Notify the teachers
                val notificationMessage = s"A student has requested to join your course ${course.name}."
                course.getTeachers.foreach {
                  _.sendNotification(notificationMessage)
                }

                Ok(views.html.courses.pending(course))
              } else if (course.enrollment == 'open) {

                // Notify the teachers
                val notificationMessage = s"A student has joined your course ${course.name}."
                course.getTeachers.foreach {
                  _.sendNotification(notificationMessage)
                }

                user.enroll(course, teacher = false)
                Redirect(routes.Courses.view(course.id.get))
              } else {
                Redirect(routes.Application.home())
				  .flashing("error" -> "Error: Unknown course enrollment type")
              }
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
		  Future {
            if (user.hasCoursePermission(course, "addStudent"))
              Ok(views.html.courses.approveRequests(course))
            else
              Errors.forbidden
          }
		}
  }

  /**
   * Approves a certain join request
   * @param courseId The ID of the course
   */
  def approveRequest(courseId: Long) = Authentication.authenticatedAction(parse.urlFormEncoded) {
    implicit request =>
      implicit user =>
	    Future {
          if (user.hasCoursePermission(Course.findById(courseId).get, "addStudent")) {
            for( id <- request.body("reqid");
                 req <- AddCourseRequest.findById(id.toLong);
                 if req.courseId == courseId
            ) { req.approve() }
            Redirect(routes.Courses.approvePage(courseId))
          } else
		    Errors.forbidden
		}
  }

  /**
   * Denies a particular join request
   * @param courseId The ID of the course
   */
  def denyRequest(courseId: Long) = Authentication.authenticatedAction(parse.urlFormEncoded) {
    implicit request =>
      implicit user =>
	    Future {
          if (user.hasCoursePermission(Course.findById(courseId).get, "addStudent")) {
            for( id <- request.body("reqid");
                 req <- AddCourseRequest.findById(id.toLong);
                 if req.courseId == courseId
            ) { req.deny() }
            Redirect(routes.Courses.approvePage(courseId))
          } else
            Errors.forbidden
		}
  }

  /**
   * Approves all selected join requests
   * @param courseId The ID of the course
   */
  def approveRequests(courseId: Long) = Authentication.authenticatedAction(parse.multipartFormData) {
    implicit request =>
      implicit user =>
	    Future {
          if (user.hasCoursePermission(Course.findById(courseId).get, "addStudent")) {
            for ( id <- request.body.dataParts("reqid");
                  req <- AddCourseRequest.findById(id.toLong);
                  if req.courseId == courseId
            ) { req.approve() }
            Ok
          } else
		    Errors.forbidden
		}
  }

  /**
   * Denies all selected join requests
   * @param courseId The ID of the course
   */
  def denyRequests(courseId: Long) = Authentication.authenticatedAction(parse.multipartFormData) {
    implicit request =>
      implicit user =>
	    Future {
          if (user.hasCoursePermission(Course.findById(courseId).get, "addStudent")) {
            for ( id <- request.body.dataParts("reqid");
                  req <- AddCourseRequest.findById(id.toLong);
                  if req.courseId == courseId
            ) { req.deny() }
            Ok
          } else
		    Errors.forbidden
        }
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
		  Future {
            if (user.hasCoursePermission(course, "removeStudent")) {
              User.findById(studentId) match {
              case Some(student) =>
                student.unenroll(course)
                Redirect(routes.Courses.view(course.id.get))
			      .flashing("info" -> "Student removed")
              case _ =>
                Errors.notFound
              }
            } else
              Errors.forbidden
		  }
        }
  }

  /**
   * Used when one removes oneself from a specific course and one is a user
   * @param id the Course Id
   */
  def quitCourse(id: Long) = Authentication.authenticatedAction() {
    implicit request =>
      implicit user =>
        getCourse(id) { course =>
          user.unenroll(course)
		  Future {
            Redirect(routes.Application.home)
			  .flashing("info" -> s"You just quit ${course.name}")
		  }
        }
  }


  /**
   * Give permissions to a user
   * @param operation add, remove or match
   */
  def setPermission(id: Long, operation: String = "") = Authentication.authenticatedAction(parse.multipartFormData) {
    implicit request =>
      implicit user =>
        val data = request.body.dataParts
        getCourse(id) { course =>
		  Future {
            if(user.hasCoursePermission(course, "teacher")) {
              User.findById(data("userId")(0).toLong) foreach { member =>
                operation match {
                  case "remove" =>
                    data("permission").foreach { permission =>
                      member.removeCoursePermission(course, permission)
                    }
                  case "match" =>
                    user.removeAllCoursePermissions(course)
                    data("permission").foreach { permission =>
                      member.addCoursePermission(course, permission)
                    }
                  case _ => data("permission").foreach { permission =>
                    member.addCoursePermission(course, permission)
                  }
                }
              }
              Ok
            } else Results.Forbidden
		  }
        }
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
		  Future {
            if(course.getMembers.contains(user)) { // Make sure the user isn't already in the course
              Redirect(routes.Courses.view(id))
			    .flashing("error" -> "You are already in this course")
            } else if (key == course.lmsKey) {
              user.enroll(course)
              Redirect(routes.Courses.view(id))
			    .flashing("info" -> ("Welcome to the course \"" + course.name + "\"."))
            } else {
              Unauthorized("Invalid key")
            }
		  }
        }
  }
}
