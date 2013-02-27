package controllers

import play.api.mvc._
import models.Movie

/**
 * Created with IntelliJ IDEA.
 * User: camman3d
 * Date: 2/19/13
 * Time: 10:05 AM
 * To change this template use File | Settings | File Templates.
 */
object Pages extends Controller {

  def levelSelect(id: Long) = logic.Authentication.authenticatedAction {
    implicit request =>
      implicit user =>
        Ok(views.html.pages.levelSelect(id))
  }

  def level1(id: Long) = logic.Authentication.authenticatedAction {
    implicit request =>
      implicit user =>
        val movie = Movie.findById(id).get
        Ok(views.html.pages.level1(movie))
  }

  def level2(id: Long) = logic.Authentication.authenticatedAction {
    implicit request =>
      implicit user =>
        val movie = Movie.findById(id).get
        Ok(views.html.pages.level2(movie))
  }

  def level3(id: Long) = logic.Authentication.authenticatedAction {
    implicit request =>
      implicit user =>
        Ok(views.html.pages.level3())
  }

  def level4(id: Long) = logic.Authentication.authenticatedAction {
    implicit request =>
      implicit user =>
        Ok(views.html.pages.level4())
  }

  def level5(id: Long) = logic.Authentication.authenticatedAction {
    implicit request =>
      implicit user =>
        Ok(views.html.pages.level5())
  }

  def level6(id: Long) = logic.Authentication.authenticatedAction {
    implicit request =>
      implicit user =>
        Ok(views.html.pages.level6())
  }

}
