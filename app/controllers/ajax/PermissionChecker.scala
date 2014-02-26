package controllers.ajax

import play.api.mvc.Controller
import controllers.authentication.Authentication
import controllers.ContentController
import models.Course
import service.DocumentPermissionChecker
import scala.concurrent.{ExecutionContext, Future}
import ExecutionContext.Implicits.global
import play.api.libs.json.JsArray

/**
 * Controller for checker users' permissions pertaining to content
 */
object PermissionChecker extends Controller {

  // Helper for document types
  val documentTypeMap = Map(
    "captionTrack" -> DocumentPermissionChecker.documentTypes.captionTrack,
    "annotations" -> DocumentPermissionChecker.documentTypes.annotations
  )

  /**
   * AJAX endpoint which checks a user's permissions to see if he/she is allowed to do things with content
   * Expected parameters
   * - contentId: The ID of the content
   * - permission: What action the user wants to do. Valid options: view, enable, edit, publish
   * - courseId (optional): The ID of the course we are operating under.
   * - documentType: What kind of document we want to deal with. Valid options: captionTrack, annotations
   * Returns a JS array of resource IDs which are permitted.
   */
  def check = Authentication.authenticatedAction(parse.urlFormEncoded) {
    implicit request =>
      implicit user =>
        val contentId = request.body("contentId")(0).toLong
        ContentController.getContent(contentId) { content =>
          // Collect data
          val permission = Symbol(request.body("permission")(0))
          val course = Course.findById(request.body.get("courseId").map(_(0).toLong).getOrElse(0))
          val documentType = documentTypeMap(request.body("documentType")(0))
          val checker = new DocumentPermissionChecker(user, content, course, documentType)

          // Look at the permission and call the appropriate function
          Async {
            (permission match {
              case 'view => checker.getViewable
              case 'enable => checker.getEnableable
              case 'edit => checker.getEditable
              case 'publish => checker.getPublishable
              case _ => Future(Nil)
            }).map { resources =>
              Ok(JsArray(resources.map(_ \ "id")))
            }
          }
      }
  }
}
