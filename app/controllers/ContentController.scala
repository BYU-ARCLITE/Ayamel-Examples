package controllers

import authentication.Authentication
import play.api.mvc.{Result, Request, Controller}
import service.ContentManagement
import models.{Course, User, Content}
import play.api.Play
import Play.current

/**
 * The controller for dealing with content.
 */
object ContentController extends Controller {

  /**
   * Action mix-in to get the content from the request
   */
  def getContent(id: Long)(f: Content => Result)(implicit request: Request[_]) = {
    val content = Content.findById(id)
    if (content.isDefined) {
      f(content.get)
    } else
      Errors.notFound
  }

  /**
   * Content creation page
   */
  def createPage = Authentication.authenticatedAction() {
    implicit request =>
      implicit user =>
        // Guests cannot create content
        Authentication.enforceNotRole(User.roles.guest) {
          Ok(views.html.content.create())
        }
  }

  /**
   * Creates content based on the posted data
   */
  def create = Authentication.authenticatedAction(parse.multipartFormData) {
    implicit request =>
      implicit user =>

        // Guests cannot create content
        Authentication.enforceNotRole(User.roles.guest) {
          // Collect the information
          val data = request.body.dataParts.mapValues(_(0))
          val contentType = Symbol(data("contentType"))
          val title = data("title")
          val description = data("description")
          val url = data("url")
          val thumbnail = data("thumbnail")

          // Create the content
          ContentManagement.createContent(title, description, url, thumbnail, user, contentType)

          Redirect(routes.Application.home()).flashing("success" -> "Content added")
        }
  }

  /**
   * Content view page
   */
  def view(id: Long) = Authentication.authenticatedAction() {
    implicit request =>
      implicit user =>
        getContent(id) {
          content =>

            // Check that the user can view the content
            if (content isVisibleBy user) {
              val resourceLibraryUrl = Play.configuration.getString("resourceLibrary.baseUrl").get
              Ok(views.html.content.view(content, resourceLibraryUrl))
            } else
              Errors.forbidden
        }
  }

  /**
   * Content view in course page
   */
  def viewInCourse(id: Long, courseId: Long) = Authentication.authenticatedAction() {
    implicit request =>
      implicit user =>
        getContent(id) {
          content =>
            Courses.getCourse(courseId) {
              course =>

                // Check that the user can view the content
                if (content isVisibleBy user) {
                  val resourceLibraryUrl = Play.configuration.getString("resourceLibrary.baseUrl").get
                  Ok(views.html.content.view(content, resourceLibraryUrl, Some(course)))
                } else
                  Errors.forbidden
            }
        }
  }

  /**
   * Content deletion endpoint
   */
  def delete(id: Long) = Authentication.authenticatedAction() {
    implicit request =>
      implicit user =>
        getContent(id) {
          content =>

            // Make sure the user is able to edit
            if (content isEditableBy user) {
              content.delete()
              Redirect(routes.ContentController.mine()).flashing("success" -> "Content deleted.")
            } else
              Errors.forbidden
        }
  }

  /**
   * "My Content" page
   */
  def mine = Authentication.authenticatedAction() {
    implicit request =>
      implicit user =>

        // Guests cannot create content
        Authentication.enforceNotRole(User.roles.guest) {
          Ok(views.html.content.mine())
        }
  }

  /**
   * Public content page
   */
  def public = Authentication.authenticatedAction() {
    implicit request =>
      implicit user =>
        val content = Content.listPublic
        Ok(views.html.content.public(content))
  }

  /**
   * Set content visibility endpoint
   */
  def setVisibility(id: Long) = Authentication.authenticatedAction(parse.urlFormEncoded) {
    implicit request =>
      implicit user =>
        getContent(id) {
          content =>

            // Make sure the user is able to edit
            if (content isEditableBy user) {
              val visibility = request.body("visibility")(0).toInt
              content.copy(visibility = visibility).save
              Redirect(routes.ContentController.view(id)).flashing("success" -> "Visibility updated.")
            } else
              Errors.forbidden
        }
  }

  /**
   * Set content shareability endpoint
   */
  def setShareability(id: Long) = Authentication.authenticatedAction(parse.urlFormEncoded) {
    implicit request =>
      implicit user =>
        getContent(id) {
          content =>

            // Make sure the user is able to edit
            if (content isEditableBy user) {
              val shareability = request.body("shareability")(0).toInt
              content.copy(shareability = shareability).save
              Redirect(routes.ContentController.view(id)).flashing("success" -> "Shareability updated.")
            } else
              Errors.forbidden
        }
  }

  def setVideoSettings(content: Content, course: Option[Course] = None)(implicit request: Request[Map[String, Seq[String]]]) {
    val prefix = course.map(c => "course_" + c.id.get + ":").getOrElse("")
    val level = request.body("level")(0)

    content.setSetting(prefix + "level", level).save
  }

  def setAudioSettings(content: Content, course: Option[Course] = None)(implicit request: Request[Map[String, Seq[String]]]) {

  }

  def setImageSettings(content: Content, course: Option[Course] = None)(implicit request: Request[Map[String, Seq[String]]]) {

  }

  def setSettings(id: Long) = Authentication.authenticatedAction(parse.urlFormEncoded) {
    implicit request =>
      implicit user =>
        getContent(id) {
          content =>

          // Make sure the user is able to edit
            if (content isEditableBy user) {
              val contentType = Symbol(request.body("contentType")(0))
              if (contentType == 'video)
                setVideoSettings(content)
              if (contentType == 'audio)
                setAudioSettings(content)
              if (contentType == 'image)
                setImageSettings(content)

              Redirect(routes.ContentController.view(id)).flashing("success" -> "Settings updated.")
            } else
              Errors.forbidden
        }
  }

  def setCourseSettings(id: Long, courseId: Long) = Authentication.authenticatedAction(parse.urlFormEncoded) {
    implicit request =>
      implicit user =>
        getContent(id) {
          content =>
            Courses.getCourse(courseId) {
              course =>

              // Make sure the user is able to edit the course
                if (user canEdit course) {
                  val contentType = Symbol(request.body("contentType")(0))
                  if (contentType == 'video)
                    setVideoSettings(content, Some(course))
                  if (contentType == 'audio)
                    setAudioSettings(content, Some(course))
                  if (contentType == 'image)
                    setImageSettings(content, Some(course))

                  Redirect(routes.ContentController.viewInCourse(id, course.id.get)).flashing("success" -> "Settings updated.")
                } else
                  Errors.forbidden
            }
        }
  }

}
