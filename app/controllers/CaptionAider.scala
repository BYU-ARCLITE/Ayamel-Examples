package controllers

import play.api.mvc.Controller
import controllers.authentication.Authentication
import play.api.Play
import models.{Course, Content}
import play.api.Play.current
import service.{AdditionalDocumentAdder, FileUploader, ResourceHelper}
import java.io.ByteArrayInputStream
import dataAccess.ResourceController
import scala.concurrent.ExecutionContext
import ExecutionContext.Implicits.global

/**
 * Created with IntelliJ IDEA.
 * User: camman3d
 * Date: 6/11/13
 * Time: 3:24 PM
 * To change this template use File | Settings | File Templates.
 */
object CaptionAider extends Controller {
  def view(id: Long, courseId: Long) = Authentication.authenticatedAction() {
    implicit request =>
      implicit user =>
        ContentController.getContent(id) {
          content =>
            val course = Course.findById(courseId)
            Ok(views.html.captionAider.view(content, course, ResourceController.baseUrl))
        }
  }

  def save = Authentication.authenticatedAction(parse.multipartFormData) {
    implicit request =>
      implicit user =>

        val params = request.body.dataParts.mapValues(_(0))
        val contentId = params("contentId").toLong
        ContentController.getContent(contentId) {
          content =>

            // TODO: Handle updating the information. Issue # 45

            val params = request.body.dataParts.mapValues(_(0))
            val mime = params("mime")
            val name = params("name")
            val label = params("label")
            val languages = List(params("language"))
            val kind = params("kind")
            val data = params("data")
            val stream = new ByteArrayInputStream(data.getBytes)

            // We need to determine if this file has already been saved
            val resourceId = params("resourceId")
            Async {
              if (resourceId.isEmpty) {
                // Create a new resource
                // Upload the data
                FileUploader.uploadStream(stream, FileUploader.uniqueFilename(name), data.getBytes.length, mime).flatMap {
                  url =>

                  // Create subtitle (subject) resource
                    ResourceHelper.createResourceWithUri(label, "", "", Nil, "text", url, mime, languages, Map("kind" -> kind)).flatMap {
                      resource =>
                        val subjectId = (resource \ "id").as[String]

                        AdditionalDocumentAdder.add(content, subjectId, 'captionTrack) {
                          course =>
                            Ok
                        }
                    }
                }

              } else {
                // Figure out which file we are replacing
                // First get the resource
                ResourceController.getResource(resourceId).flatMap {
                  json =>
                    val resource = json \ "resource"

                    // Now find the file
                    val url = ((resource \ "content" \ "files")(0) \ "downloadUri").as[String]
                    val filename = url.substring(url.lastIndexOf("/") + 1)

                    // Replace the file
                    FileUploader.uploadStream(stream, filename, data.getBytes.length, mime).map {
                      url =>
                        Ok
                    }
                }
              }
            }
        }
  }

}
