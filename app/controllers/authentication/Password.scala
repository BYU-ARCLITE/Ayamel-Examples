package controllers.authentication

import play.api.mvc.{Action, Controller}
import service.HashTools
import anorm.NotAssigned
import models.User

/**
 * Created with IntelliJ IDEA.
 * User: camman3d
 * Date: 3/21/13
 * Time: 4:50 PM
 * To change this template use File | Settings | File Templates.
 */
object Password extends Controller {

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

  def createAccount(path: String = "") = Action(parse.urlFormEncoded) {
    implicit request =>
      val username = request.body("username")(0)
      val password1 = request.body("password1")(0)
      val password2 = request.body("password2")(0)
      val name = request.body("name")(0)
      val email = request.body("email")(0)

      // Check the username isn't taken
      val existingUser = User.findByUsername('password, username)
      if (existingUser.isEmpty) {

        // Check the passwords match
        if (password1 == password2) {
          val passwordHash = HashTools.sha256Base64(password1)
          val user = User(NotAssigned, passwordHash, 'password, username, Some(name), Some(email), User.roles.student).save
          Authentication.login(user, path)
        } else
          Redirect(controllers.routes.Application.index().toString(), request.queryString)
            .flashing("alert" -> "Passwords do not match")
      } else
        Redirect(controllers.routes.Application.index().toString(), request.queryString)
          .flashing("alert" -> "That username is already taken.")
  }
}
