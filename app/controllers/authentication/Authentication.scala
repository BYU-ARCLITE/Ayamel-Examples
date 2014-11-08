package controllers.authentication

import play.api.mvc._
import models.{User, SitePermissions}
import anorm.NotAssigned
import controllers.Errors
import service.TimeTools

/**
 * This controller does logging out and has a bunch of helpers for dealing with authentication and permissions.
 */
object Authentication extends Controller {

  /**
   * Given a user, logs the user in and sets up the session
   * @param user The user to log
   * @param path A path where the user will be redirected
   * @return The result. To be called from within an action
   */
  def login(user: User, path: String)(implicit request: RequestHeader): Result = {

    // Check if the user's account is merged. If it is, then login with the primary account, if this one isn't it
    val accountLink = user.getAccountLink
    val loginUser =
      if (accountLink.isDefined && user.id.get != accountLink.get.primaryAccount)
        User.findById(accountLink.get.primaryAccount).getOrElse(user)
      else user

    // Log the user in
    loginUser.copy(lastLogin = TimeTools.now()).save

    // Redirect
    {
      if (path.isEmpty)
        Redirect(controllers.routes.Application.home())
      else
        Redirect(path)
    }.withSession("userId" -> loginUser.id.get.toString)
      .flashing("success" -> ("Welcome " + loginUser.displayName + "!"))
  }

  /**
   * Merges a user with the active user
   * @param user The user account to merge with the active one
   */
  def merge(user: User)(implicit request: RequestHeader): Result = {
    getUserFromRequest().map { activeUser =>
      if (activeUser != user) {
        activeUser.merge(user)
        Redirect(controllers.routes.Users.accountSettings()).flashing("success" -> "Account merged.")
      } else
        Redirect(controllers.routes.Users.accountSettings()).flashing("alert" -> "You cannot merge an account with itself")
    }.getOrElse {
      Redirect(controllers.routes.Application.index()).flashing("alert" -> "You are not logged in")
    }
  }

  /**
   * Logs out
   */
  def logout = Action {
    implicit request =>
      val user = getUserFromRequest()(request).get
      val accountLink = user.getAccountLink
      val service = controllers.routes.Application.index().absoluteURL()
      val casLogoutUrl  = "https://cas.byu.edu/cas/logout?service="

      // If the account is not linked, there exists only one authentication scheme
      val redir:String = if (accountLink == None) {
        if (user.authScheme == 'cas) { casLogoutUrl + service } else { service }
      } else {
        val users = accountLink.get.getUsers
        val authSchemes = for (u <- accountLink.get.getUsers) yield { u.authScheme }
        if (authSchemes.contains('cas)) { casLogoutUrl + service } else { service }
      }
      Redirect(redir).withNewSession
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
    user.getOrElse {
      val user = User(NotAssigned, username, authScheme, username, name, email).save
      SitePermissions.assignRole(user, 'student)
      user
    }
  }


  // ==========================
  //   Authentication Helpers
  // ==========================
  // These are to help with creating authenticated
  // action or ensuring a certain access level.
  // ==========================


  def enforcePermission(permission: String)(result: Result)(implicit request: Request[_], user: User): Result = {
    if (user.hasSitePermission(permission))
      result
    else
      Errors.forbidden
  }

  def getUserFromRequest()(implicit request: RequestHeader): Option[User] = {
    request.session.get("userId").flatMap( userId => User.findById(userId.toLong) )
  }

  /**
   * A generic action to be used on authenticated pages.
   * @param f The action logic. A curried function which, given a request and the authenticated user, returns a result.
   * @return The result. Either a redirect due to not being logged in, or the result returned by <strong>f</strong>.
   */
  def authenticatedAction[A](parser: BodyParser[A] = BodyParsers.parse.anyContent)(f: Request[A] => User => Result) = Action(parser) {
    implicit request =>
      getUserFromRequest().map( user => f(request)(user) ).getOrElse(
        Redirect(controllers.routes.Application.index().toString(), Map("path" -> List(request.path)))
          .flashing("alert" -> "You are not logged in")
      )
  }

}
