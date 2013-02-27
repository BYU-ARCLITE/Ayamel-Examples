package logic

import models.User
import anorm.NotAssigned
import play.api.mvc.Results.Redirect
import play.api.mvc.{Action, Result, Request, PlainResult}
import controllers.routes

/**
 * Created with IntelliJ IDEA.
 * User: camman3d
 * Date: 2/15/13
 * Time: 1:39 PM
 * To change this template use File | Settings | File Templates.
 */
object Authentication {
  def login(user: User): PlainResult = {
    val displayName = user.name.getOrElse(user.username)
    Redirect(controllers.routes.Application.home())
      .withSession("userId" -> user.id.get.toString)
      .flashing("success" -> ("Welcome " + displayName + "!"))
  }

  def loginCas(username: String): PlainResult = {
    // Check if the user is already created
    val user = User.findByAuthInfo(username, 'cas)
    if (user.isDefined)

      // Yes, so just login
      login(user.get)
    else {

      // No, so create an account
      val newUser = User(NotAssigned, username, 'cas, username).save
      login(newUser)
    }
  }

  def loginGoogle(username: String, firstName: String, lastName: String, email: String): PlainResult = {
    // Check if the user is already created
    val user = User.findByAuthInfo(username, 'google)
    if (user.isDefined)

      // Yes, so just login
      login(user.get)
    else {

      // No, so create an account
      val newUser = User(NotAssigned, username, 'google, username, Some(firstName + " " + lastName), Some(email)).save
      login(newUser)
    }
  }

  def authenticatedAction(f: Request[_] => User => Result) = Action {
    request =>
      val userId = request.session.get("userId")
      if (userId.isDefined) {
        val user = User.findById(userId.get.toLong)
        if (user.isDefined) {
          f(request)(user.get)
        } else
          Redirect(routes.Application.index()).flashing("alert" -> "You are not logged in.")
      } else
        Redirect(routes.Application.index()).flashing("alert" -> "You are not logged in.")
  }
}
