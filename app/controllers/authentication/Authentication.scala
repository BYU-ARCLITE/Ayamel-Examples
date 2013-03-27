package controllers.authentication

import play.api.mvc._
import models.User
import anorm.NotAssigned
import controllers.Errors

/**
 * This controller does logging out and has a bunch of helpers for dealing with authentication and roles.
 */
object Authentication extends Controller {

  /**
   * Given a user, logs the user in and sets up the session
   * @param user The user to log
   * @return The result. To be called from within an action
   */
  def login(user: User): Result = {
    val displayName = user.name.getOrElse(user.username)
    Redirect(controllers.routes.Application.home())
      .withSession("userId" -> user.id.get.toString)
      .flashing("success" -> ("Welcome " + displayName + "!"))
  }

  /**
   * Logs out
   */
  def logout = Action {
    Redirect(controllers.routes.Application.index()).withNewSession
  }

  /**
   * Once the user is authenticated with some scheme, call this to get the actual user object. If it doesn't exist then
   * it will be created.
   * @param username The username of the user
   * @param authScheme The auth scheme used to authenticate
   * @param name The name of the user. Used only if creating the user.
   * @param email The email of the user. Used only if creating the user.
   * @return The user
   */
  def getAuthenticatedUser(username: String, authScheme: Symbol, name: Option[String] = None, email: Option[String] = None): User = {
    // Check if the user is already created
    val user = User.findByAuthInfo(username, authScheme)
    user.getOrElse(
      User(NotAssigned, username, authScheme, username, name, email, User.roles.student).save
    )
  }


  // ==========================
  //   Authentication Helpers
  // ==========================
  // These are to help with creating authenticated
  // action or ensuring a certain access level.
  // ==========================


  def enforceRole(role: Int)(result: Result)(implicit request: Request[_], user: User): Result = {
    if (user.role == role)
      result
    else
      Errors.forbidden
  }

  def enforceNotRole(role: Int)(result: Result)(implicit request: Request[_], user: User): Result = {
    if (user.role != role)
      result
    else
      Errors.forbidden
  }

  /**
   * A generic action to be used on authenticated pages.
   * @param f The action logic. A curried function which, given a request and the authenticated user, returns a result.
   * @return The result. Either a redirect due to not being logged in, or the result returned by <strong>f</strong>.
   */
  def authenticatedAction[A](parser: BodyParser[A] = BodyParsers.parse.anyContent)(f: Request[A] => User => Result) = Action(parser) {
    request =>
      val userId = request.session.get("userId")
      if (userId.isDefined) {
        val user = User.findById(userId.get.toLong)
        if (user.isDefined) {
          f(request)(user.get)
        } else
          Redirect(controllers.routes.Application.index()).flashing("alert" -> "You are not logged in")
      } else
        Redirect(controllers.routes.Application.index()).flashing("alert" -> "You are not logged in")
  }


}
