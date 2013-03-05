package controllers

import play.api.mvc._
import models.Video

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
        val video = Video.findById(id).get
        Ok(views.html.pages.level1(video))
  }

  def level2(id: Long) = logic.Authentication.authenticatedAction {
    implicit request =>
      implicit user =>
        val video = Video.findById(id).get
        Ok(views.html.pages.level2(video))
  }

  def level3(id: Long) = logic.Authentication.authenticatedAction {
    implicit request =>
      implicit user =>
        val video = Video.findById(id).get
        Ok(views.html.pages.level3(video))
  }

  def level4(id: Long) = logic.Authentication.authenticatedAction {
    implicit request =>
      implicit user =>
        val video = Video.findById(id).get
        Ok(views.html.pages.level4(video))
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
