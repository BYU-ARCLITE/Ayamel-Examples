package controllers.ajax

import play.api.mvc.Controller
import controllers.authentication.Authentication
import models.{Course, Content}
import controllers.ContentController
import service.DocumentPermissionChecker
import scala.concurrent.{ExecutionContext, Future}
import ExecutionContext.Implicits.global
import play.api.libs.json.JsArray

/**
 * Created with IntelliJ IDEA.
 * User: josh
 * Date: 6/20/13
 * Time: 1:04 PM
 * To change this template use File | Settings | File Templates.
 */
object PermissionChecker extends Controller {

  val documentTypeMap = Map(
    "captionTrack" -> DocumentPermissionChecker.documentTypes.captionTrack,
    "annotations" -> DocumentPermissionChecker.documentTypes.annotations
  )

  def check = Authentication.authenticatedAction(parse.urlFormEncoded) {
    implicit request =>
      implicit user =>
        val contentId = request.body("contentId")(0).toLong
        ContentController.getContent(contentId) {
          content =>

            val permission = Symbol(request.body("permission")(0))
            val course = Course.findById(request.body.get("courseId").map(_(0).toLong).getOrElse(0))
            val documentType = documentTypeMap(request.body("documentType")(0))
            val checker = new DocumentPermissionChecker(user, content, course, documentType)

            Async {
              val results =
                if (permission == 'view)
                  checker.getViewable
                else if (permission == 'enable)
                  checker.getEnableable
                else if (permission == 'edit)
                  checker.getEditable
                else if (permission == 'publish)
                  checker.getPublishable
                else
                  Future(Nil)

              results.map(resources =>
                Ok(JsArray(resources.map(_ \ "id")))
              )
            }
        }
  }
}
