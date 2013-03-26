package controllers

import play.api.mvc.{Result, Request, Controller}
import service.{ContentManagement, Authentication}
import models.{User, Content}

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
      NotFound
  }

  /**
   * Content creation page
   */
  def createPage = Authentication.authenticatedAction() {
    implicit request =>
      implicit user =>

        // If the user isn't a guest then allow it
        if (user.role != User.roles.guest)
          Ok(views.html.content.create())
        else
          Forbidden
  }

  /**
   * Creates content based on the posted data
   */
  def create = Authentication.authenticatedAction(parse.multipartFormData) {
    implicit request =>
      implicit user =>

      // If the user isn't a guest then allow it
        if (user.role != User.roles.guest) {
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
        } else
          Forbidden
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
            if (content isVisibleBy user)
              Ok(views.html.content.view(content))
            else
              Forbidden
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
              Forbidden
        }
  }

  /**
   * "My Content" page
   */
  def mine = Authentication.authenticatedAction() {
    implicit request =>
      implicit user =>

        // If the user isn't a guest then allow it
        if (user.role != User.roles.guest)
          Ok(views.html.content.mine())
        else
          Forbidden
  }

  /**
   * Public content page
   */
  def public = Authentication.authenticatedAction() {
    implicit request =>
      implicit user =>
        val content = Content.list.filter(_.visibility == Content.visibility.public)
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
              Forbidden
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
              Forbidden
        }
  }

}
