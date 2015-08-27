package controllers

import authentication.Authentication
import play.api.mvc.Controller
import models._
import service.{FileUploader, ImageTools, HashTools}
import scala.util.{Try, Success, Failure}
import javax.imageio.ImageIO
import scala.concurrent.ExecutionContext
import ExecutionContext.Implicits.global

/**
 * Controller dealing with users
 */
object Users extends Controller {

  /**
   * View notifications
   */
  def notifications = Authentication.authenticatedAction() {
    implicit request =>
      implicit user =>
        Ok(views.html.users.notifications())
  }

  def modNotification(ids: Seq[String], user: User)(cb: Notification => Unit) =
    for(
      id <- ids;
      note <- try{
        Notification.findById(id.toLong)
      }catch{
        case _: Exception => None
      } if (user.getNotifications.contains(note))
    ) cb(note)

  /**
   * Marks a notification as read
   * @param id The ID of the notification
   */
  def markNotification() = Authentication.authenticatedAction(parse.multipartFormData) {
    implicit request =>
      implicit user =>
        modNotification(request.body.dataParts("id"), user) { note =>
          note.copy(messageRead = true).save
        }
        Ok
  }

  /**
   * Deletes a notification
   * @param id The ID of the notification
   */
  def deleteNotification() = Authentication.authenticatedAction(parse.multipartFormData) {
    implicit request =>
      implicit user =>
         modNotification(request.body.dataParts("id"), user) { note =>
          note.delete()
        }
        Ok
  }

  /**
   * The account settings view
   */
  def accountSettings = Authentication.authenticatedAction() {
    implicit request =>
      implicit user =>
        Ok(views.html.users.accountSettings())
  }

  /**
   * Saves the user account information
   */
  def saveSettings = Authentication.authenticatedAction(parse.urlFormEncoded) {
    implicit request =>
      implicit user =>

      // Change the user information
        val name = request.body("name")(0)
        val email = request.body("email")(0)
        user.copy(name = Some(name), email = Some(email)).save

        Redirect(routes.Users.accountSettings()).flashing("info" -> "Personal information updated.")
  }

  /**
   * Changes the user's password
   */
  def changePassword = Authentication.authenticatedAction(parse.urlFormEncoded) {
    implicit request =>
      implicit user =>

        val password1 = request.body("password1")(0)
        val password2 = request.body("password2")(0)
        val redirect = Redirect(routes.Users.accountSettings())

        // Make sure the passwords match
        if (password1 == password2) {
          user.copy(authId = HashTools.sha256Base64(password1)).save
          redirect.flashing("info" -> "Password changed.")
        } else
          redirect.flashing("alert" -> "Passwords don't match.")
  }

  /**
   * Updates the user's profile picture
   */
  def uploadProfilePicture = Authentication.authenticatedAction(parse.multipartFormData) {
    implicit request =>
      implicit user =>
        val redirect = Redirect(routes.Users.accountSettings())

        // Load the image from the file and make it into a thumbnail
        request.body.file("file").flatMap { picture =>
          Try(Option(ImageIO.read(picture.ref.file))) match {
            case Success(imgOpt) =>
              imgOpt.map { image =>
                ImageTools.makeThumbnail(image) match {
                  case Some(image) => Async { // Upload the file
                    FileUploader.uploadImage(image, picture.filename).map { url =>
                      if(url.isDefined) {
                        // Save the user info about the profile picture
                        user.copy(picture = url).save
                        redirect.flashing("info" -> "Profile picture updated")
                      } else {
                        redirect.flashing("error" -> "Failed to upload image")
                      }
                    }
                  }
                  case None => redirect.flashing("error" -> "Unknown error while processing image")
                }
              }
            case Failure(_) => Some(redirect.flashing("error" -> "Could not read image"))
          }
        }.getOrElse {
          redirect.flashing("error" -> "Missing file")
        }
  }

  /**
   * The permission request page.
   */
  def permissionRequestPage = Authentication.authenticatedAction() {
    implicit request =>
      implicit user =>
        Authentication.enforcePermission("requestPermission") {
          Ok(views.html.users.permissionRequest.requestForm())
        }
  }

  /**
   * Creates and submits a permission request for the active user
   */
  def submitPermissionRequest = Authentication.authenticatedAction(parse.urlFormEncoded) {
    implicit request =>
      implicit user =>
        Authentication.enforcePermission("requestPermission") {
          val permission = request.body("permission")(0)
          val reason = request.body("reason")(0)
          val desc = SitePermissions.getDescription(permission)

          // Check to see if the user already has the requested permission
          // or has already submitted a request
          if (user.hasSitePermission(permission)) {
            Redirect(routes.Users.permissionRequestPage())
              .flashing("info" -> s"You already have $desc permission")
          } else {
            if (SitePermissionRequest.findByUser(user, permission).isEmpty) {
              user.requestPermission(permission, reason)
            }
            Redirect(routes.Users.accountSettings())
              .flashing("success" -> s"Your request for $desc permission has been submitted.")
          }
        }
  }
}
