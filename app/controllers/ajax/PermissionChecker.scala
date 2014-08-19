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
          val ids = request.body("ids")(0).split(",").toList.filter(!_.isEmpty)
          if(ids.length == 0) BadRequest
          val checker = new DocumentPermissionChecker(user, content, course, request.body("documentType")(0))

          // Look at the permission and call the appropriate function
          Async {
            (permission match {
              case 'view => checker.checkViewable(ids)
              case 'enable => checker.checkEnableable(ids)
              case 'edit => checker.checkEditable(ids)
              case _ => Future(Nil)
            }).map { resources =>
              //possible room for request minimization if this just returns complete resources instead
              Ok(JsArray(resources.map(_ \ "id")))
            }
          }
      }
  }
}
