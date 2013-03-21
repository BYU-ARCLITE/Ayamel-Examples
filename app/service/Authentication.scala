package service

import models.User
import anorm.NotAssigned
import play.api.mvc.Results.Redirect
import play.api.mvc._
import controllers.routes
import scala.Some

/**
 * This handles authentication with different methods
 */
object Authentication {

  /**
   * This simply logs in by redirecting to the home page and setting up the session.
   * @param user The user to log in as
   * @return The redirect result
   */
  def login(user: User): PlainResult = {
    val displayName = user.name.getOrElse(user.username)
    Redirect(controllers.routes.Application.home())
      .withSession("userId" -> user.id.get.toString)
      .flashing("success" -> ("Welcome " + displayName + "!"))
  }

  /**
   * CAS login.
   * @param username The username provided by CAS
   * @return The login redirect result
   */
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

  /**
   * Login with Google
   * @param username The user ID provided by Google.
   * @param firstName The first name provided by Google.
   * @param lastName The last name provided by Google.
   * @param email The email provided by Google.
   * @return The login redirect result.
   */
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

  /**
   * Password-based login. If the credentials are bad, then it redirects to the login page
   * @param username The username
   * @param password The password
   * @return The redirect result. If successful, then logs in. If not, the it redirects to the login page.
   */
  def loginPassword(username: String, password: String): PlainResult = {
    // Get the user based on the username and password
    val user = User.findByAuthInfo(HashTools.sha256Base64(password), 'password).find(_.username == username)
    if (user.isDefined)

      // Yes, so just login
      login(user.get)
    else {

      // No, so redirect
      // TODO: Change this when there is a definite login page
      Redirect(routes.Application.index()).flashing("error" -> "Invalid username/password.")
    }
  }

  /**
   * A generic action to be used on authenticated pages.
   * @param f The action logic. A curried function which, given a request and the authenticated user, returns a result.
   * @return The result. Either a redirect due to not being logged in, or the result returned by <strong>f</strong>.
   */
  def authenticatedAction(f: Request[AnyContent] => User => Result) = Action {
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
