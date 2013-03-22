package controllers.documentation

import play.api.mvc.{Action, Result, SimpleResult, Controller}

/**
 * This controller handles documentation relating to teachers.
 */
object Teacher extends Controller {

  val pageMap = Map(
    "index"                             -> tableOfContents,
    "create-a-new-course"               -> createCourse,
    "add-a-course-to-an-lms-with-lti"   -> addCourseLTI,
    "add-a-course-to-an-lms-with-a-url" -> addCourseKey,
    "add-students-to-a-course"          -> addStudents
  )

  def view(page: String) = Action {
    if (pageMap.contains(page))
      pageMap(page)
    else
      NotFound
  }

  def tableOfContents(): Result = {
    Ok("TODO - table of contents")
  }

  def createCourse(): Result = {
    Ok("TODO - Create a new course")
  }

  def addCourseLTI(): Result = {
    Ok("TODO")
  }

  def addCourseKey(): Result = {
    Ok("TODO")
  }

  def addStudents(): Result = {
    Ok("TODO")
  }

}
