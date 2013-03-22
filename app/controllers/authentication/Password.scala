package controllers.authentication

import play.api.mvc.{Action, Controller}
import service.{HashTools, Authentication}
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
  def login = Action(parse.urlFormEncoded) {
    request =>
      val username = request.body("username")(0)
      val password = request.body("password")(0)
      Authentication.loginPassword(username, password)
  }

  def createAccount = Action(parse.urlFormEncoded) {
    request =>
      val username = request.body("username")(0)
      val password1 = request.body("password1")(0)
      val password2 = request.body("password2")(0)
      val name = request.body("name")(0)
      val email = request.body("email")(0)
      Authentication.createAccount(username, password1, password2, name, email)
  }
}
