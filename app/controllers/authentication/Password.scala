package controllers.authentication

import play.api.mvc.{Action, Controller}
import service.HashTools
import models.{User, SitePermissions}

/**
 * Controller which handles password authentication and account creation
 */
object Password extends Controller {

  /**
   * Logs the user in
   * @param action Login or merge
   * @param path When logging in, the path where the user will be redirected
   */
  def login(action: String, path: String = "") = Action(parse.urlFormEncoded) {
    implicit request =>
      val username = request.body("username")(0)
      val password = request.body("password")(0)

      // Get the user based on the username and password
      val user = User.findByUsername('password, username)
      val passwordHash = HashTools.sha256Base64(password)

      // Check that the user exists and the password matches
      if (user.isDefined && user.get.authId == passwordHash) {

        if (action == "merge")
          Authentication.merge(user.get)
        else
          Authentication.login(user.get, path)
      } else {

        if (action == "merge")
          Redirect(controllers.routes.Users.accountSettings()).flashing("error" -> "Invalid username/password.")
        else
          Redirect(controllers.routes.Application.index().toString(), request.queryString)
            .flashing("error" -> "Invalid username/password.")
      }
  }

  /**
   * Creates an account for the user
   * @param path The where the user will be redirected after account creation
   */
  def createAccount(path: String = "") = Action(parse.urlFormEncoded) {
    implicit request =>
      val username = request.body("username")(0)
      val password1 = request.body("password1")(0)
      val password2 = request.body("password2")(0)
      val name = request.body("name")(0)
      val email = request.body("email")(0)

      // Check the username isn't taken
      if (User.findByUsername('password, username).isEmpty) {

        // Check the passwords match
        if (password1 == password2) {
          val passwordHash = HashTools.sha256Base64(password1)
          val user = User(None, passwordHash, 'password, username, Some(name), Some(email)).save
          SitePermissions.assignRole(user, 'student)
          Authentication.login(user, path)
        } else
          Redirect(controllers.routes.Application.index().toString(), request.queryString)
            .flashing("alert" -> "Passwords do not match")
      } else
        Redirect(controllers.routes.Application.index().toString(), request.queryString)
          .flashing("alert" -> "That username is already taken.")
  }
}
