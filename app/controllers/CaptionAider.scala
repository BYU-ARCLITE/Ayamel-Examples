package controllers

import play.api.mvc.Controller
import controllers.authentication.Authentication
import models.Course
import service.{AdditionalDocumentAdder, FileUploader, ResourceHelper}
import java.io.ByteArrayInputStream
import dataAccess.ResourceController
import scala.concurrent.ExecutionContext
import ExecutionContext.Implicits.global
import play.api.libs.json.{JsObject, Json}

/**
 * Controller associated with CaptionAider.
 */
object CaptionAider extends Controller {

  /**
   * View CaptionAider. You specify the ID of the content and the ID of the course under whose context we will operate.
   * If there is no course, specify 0 as the ID.
   */
  def view(id: Long, courseId: Long) = Authentication.authenticatedAction() {
    implicit request =>
      implicit user =>
        ContentController.getContent(id) {
          content =>
            val course = Course.findById(courseId)
            Ok(views.html.captionAider.view(content, course, ResourceController.baseUrl))
        }
  }

  /**
   * Saves a track. To be used as an AJAX call.
   * Expected parameters:
   * - contentId: The content ID
   * - mime: The MIME type
   * - name: The filename of the track (with extension)
   * - label: The title of the track (no extension)
   * - language: The language of the track
   * - kind: "subtitles" or "captions"
   * - data: The data to save in the track file
   * - courseId (optional): The course ID that will own the track. If not specified, the user owns it.
   */
  def save = Authentication.authenticatedAction(parse.multipartFormData) {
    implicit request =>
      implicit user =>

        val params = request.body.dataParts.mapValues(_(0))
        val contentId = params("contentId").toLong
        ContentController.getContent(contentId) {
          content =>

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
                    val resource = ResourceHelper.make.resource(Json.obj(
                      "title" -> label,
                      "keywords" -> kind,
                      "type" -> "data",
                      "languages" -> Json.obj(
                        "iso639_3" -> languages
                      )
                    ))
                    ResourceHelper.createResourceWithUri(resource, url, data.getBytes.length, mime).flatMap {
                      createdResource =>
                        val subjectId = (createdResource \ "id").as[String]

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

                    // Handle updating the information.
                    val updatedFile = (resource \ "content" \ "files")(0).as[JsObject] ++ Json.obj("attributes" -> Json.obj("kind" -> kind))
                    val updatedResource = resource.as[JsObject] ++ Json.obj(
                      "title" -> label,
                      "languages" -> Json.obj(
                        "iso639_3" -> languages
                      ),
                      "content" -> Json.obj("files" -> List(updatedFile))
                    )
                    ResourceController.updateResource(resourceId, updatedResource)

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
