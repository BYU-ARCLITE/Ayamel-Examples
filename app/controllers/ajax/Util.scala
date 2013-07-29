package controllers.ajax

import play.api.mvc.{Action, Controller}
import service.ResourceHelper

/**
 * Endpoint for various AJAX utilities
 */
object Util extends Controller {

  /**
   * Given a URI determines the MIME type
   */
  def detectMime = Action(parse.urlFormEncoded) {
    request =>
      val uri = request.body("uri")(0)
      val mime = ResourceHelper.getMimeFromUri(uri)
      Ok(mime)
  }

}
