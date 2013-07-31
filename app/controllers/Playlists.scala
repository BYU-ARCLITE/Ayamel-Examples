package controllers

import play.api.mvc.Controller
import controllers.authentication.Authentication
import dataAccess.{ResourceController, PlayGraph}

/**
 * Controller dealing with playlists (playgraphs)
 */
object Playlists extends Controller {

  /**
   * The about page. View information/description of the playlist
   * @param id The ID of the playlist
   */
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

  /**
   * View (play) a particular playlist
   * @param id The ID of the playlist
   */
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
