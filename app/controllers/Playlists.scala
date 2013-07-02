package controllers

import play.api.mvc.Controller
import controllers.authentication.Authentication
import dataAccess.{ResourceController, PlayGraph}

/**
 * Created with IntelliJ IDEA.
 * User: josh
 * Date: 7/2/13
 * Time: 10:45 AM
 * To change this template use File | Settings | File Templates.
 */
object Playlists extends Controller {

  def about(id: Long) = Authentication.authenticatedAction() {
    implicit request =>
      implicit user =>
        ContentController.getContent(id) {
          content =>
            // Check the content type
            if (content.contentType == 'playlist) {
              // Check that the user can view the content
              if (content isVisibleBy user) {
                Ok(views.html.playlists.about(content, PlayGraph.host, PlayGraph.authorKey.consumerKey,
                  PlayGraph.playerKey.consumerKey))
              } else {
                Errors.forbidden
              }
            } else {
              Redirect(routes.ContentController.view(id))
            }
        }
  }

  def view(id: Long) = Authentication.authenticatedAction() {
    implicit request =>
      implicit user =>
        ContentController.getContent(id) {
          content =>
            // Check the content type
            if (content.contentType == 'playlist) {
              // Check that the user can view the content
              if (content isVisibleBy user) {
                Ok(views.html.playlists.view(content, PlayGraph.host, PlayGraph.playerKey.consumerKey,
                  PlayGraph.playerKey.consumerSecret, ResourceController.baseUrl))
              } else {
                Errors.forbidden
              }
            } else {
              Redirect(routes.ContentController.view(id))
            }
        }
  }

}
