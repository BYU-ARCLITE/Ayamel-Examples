package controllers

import play.api.mvc._
import models.Course
import service.LMSAuth

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
        Ok("Course: " + course.toString)
  }

}
