package controllers

import play.api.mvc._
import models.{User, Content, Course}
import service.{TimeTools, Authentication, LMSAuth}
import anorm.NotAssigned

/**
 * This controller manages all the pages relating to courses, including authentication.
 */
object Courses extends Controller {

  /**
   * A generic action that automatically checks the course and returns it if found, otherwise give a 404.
   * Also, you can specify the body parser. This is needed for lti authentication, where the body needs to be a string.
   * @param id The id of the course
   * @param parser (optional) The body parser
   * @param f The action logic. A curried function which, given a request and course, returns a result.
   * @tparam A The type of the request body
   * @return The result. Either a 404 or the returned result from <strong>f</strong>.
   */
  def courseAction[A](id: Long, parser: BodyParser[A] = parse.anyContent)(f: Request[A] => Course => Result) = Action(parser) {
    request =>
      val course = Course.findById(id)
      if (course.isDefined)
        f(request)(course.get)
      else
        NotFound
  }

  /**
   * The lti authentication page. Redirects to the course page if successful.
   */
  def ltiAuth(id: Long) = courseAction(id, parse.tolerantText) {
    implicit request =>
      course =>
        val user = LMSAuth.ltiAuth(course)
        if (user.isDefined)
          Redirect(routes.Courses.view(id)).withSession("userId" -> user.get.id.get.toString)
        else
          Forbidden
  }

  /**
   * The key-based authentication page. Redirects to the course page if successful.
   */
  def keyAuth(id: Long) = courseAction(id) {
    implicit request =>
      course =>
        val user = LMSAuth.keyAuth(course)
        if (user.isDefined)
          Redirect(routes.Courses.view(id)).withSession("userId" -> user.get.id.get.toString)
        else
          Forbidden
  }

  /**
   * The course page.
   */
  def view(id: Long) = courseAction(id) {
    implicit request =>
      course =>
        Authentication.authenticate(request) {
          implicit user =>
            if (course.getMembers.contains(user))
              Ok(views.html.courses.view(course))
            else
              Forbidden
        }
  }

  def addContent(id: Long) = courseAction(id, parse.urlFormEncoded) {
    implicit request =>
      course =>
        Authentication.authenticate(request) {
          implicit user =>

            // Only non-guest members and admins can add content
            if (user canAddContentTo course) {

              // Add the content to the course
              val contentId = request.body("addContent")(0).toLong
              val content = Content.findById(contentId)
              if (content.isDefined) {
                course.addContent(content.get)
                Redirect(routes.Courses.view(id)).flashing("success" -> "Content added to course.")
              } else
                NotFound
            } else
              Forbidden
        }
  }

  def create = service.Authentication.authenticatedAction(parse.urlFormEncoded) {
    request =>
      user =>

        // Check if the user is allowed to create a course
        if (user.canCreateCourse) {
          // Collect info
          val courseName = request.body("courseName")(0)
          val startDate = request.body("startDate")(0)
          val endDate = request.body("endDate")(0)

          // Create the course
          val course = Course(NotAssigned, courseName, TimeTools.parseDate(startDate), TimeTools.parseDate(endDate)).save
          user.enroll(course, teacher = true)

          // Redirect to the course page
          Redirect(routes.Courses.view(course.id.get)).flashing("success" -> "Course Added")
        } else
          Forbidden
  }

  def createPage = service.Authentication.authenticatedAction() {
    implicit request =>
      implicit user =>

        // Check if the user is allowed to create a course
        if (user.canCreateCourse)
          Ok(views.html.courses.create())
        else
          Forbidden
  }

  def list = Authentication.authenticatedAction() {
    implicit request =>
      implicit user =>

        // Guest user's are limited to their course. No browsing
        if (user.role != User.roles.guest) {
          val courses = Course.list
          Ok(views.html.courses.list(courses))
        } else
          Forbidden
  }
}
