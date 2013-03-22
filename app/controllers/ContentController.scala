package controllers

import play.api.mvc.Controller
import service.Authentication

/**
 * Created with IntelliJ IDEA.
 * User: camman3d
 * Date: 3/22/13
 * Time: 1:27 PM
 * To change this template use File | Settings | File Templates.
 */
object ContentController extends Controller {

  def create = Authentication.authenticatedAction {
    implicit request =>
      implicit user =>

        Ok("TODO: Create")
  }

  def view(id: Long) = Authentication.authenticatedAction {
    implicit request =>
      implicit user =>
        Ok("TODO: View")
  }

}
