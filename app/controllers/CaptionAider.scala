package controllers

import play.api.mvc.Controller
import controllers.authentication.Authentication
import models.Course
import service.{AdditionalDocumentAdder, FileUploader, ResourceHelper}
import java.io.ByteArrayInputStream
import dataAccess.ResourceController
import scala.concurrent.{ExecutionContext, Future}
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
        ContentController.getContent(id) { content =>
          val course = Course.findById(courseId)
          Ok(views.html.captionAider.view(content, course, ResourceController.baseUrl))
        }
  }

  /**
   * Saves a track. To be used as an AJAX call.
   * Expected parameters:
   * - contentId: The content ID
   * - file: an uploaded file
   * - label: The title of the track (no extension)
   * - language: The language of the track
   * - kind: "subtitles" or "captions"
   * - courseId (optional): The course ID that will own the track. If not specified, the user owns it.
   */
  def save = Authentication.authenticatedAction(parse.multipartFormData) {
    implicit request =>
      implicit user =>

        val params = request.body.dataParts.mapValues(_(0))
        val contentId = params("contentId").toLong
        ContentController.getContent(contentId) { content =>
          request.body.file("file").map { tmpFile =>
            val label = params("label")
            val languages = List(params("language"))
            val kind = params("kind")

            // We need to determine if this file has already been saved
            val resourceId = params.getOrElse("resourceId","")

            val mime = tmpFile.contentType.getOrElse("text/plain")
            val file = tmpFile.ref.file
            val size = file.length()

            Async {
              if (resourceId.isEmpty) {
                //TODO: This is where we need to edit stuff to use the proper Resource Library API

                // Create a new resource
                // Upload the data
                val name = FileUploader.uniqueFilename(tmpFile.filename)
                FileUploader.uploadFile(file, name, mime).flatMap {
                  case Some(url) =>
                    // Create subtitle (subject) resource
                    val resource = ResourceHelper.make.resource(Json.obj(
                      "title" -> label,
                      // "keywords" -> kind, //This makes no sense.... kind should be recorded in relations
                      "type" -> "document",
                      "languages" -> Json.obj(
                        "iso639_3" -> languages
                      )
                    ))
                    ResourceHelper.createResourceWithUri(resource, user, url, size, mime).flatMap {
                      case Some(json) =>
                        val subjectId = (json \ "id").as[String]
                        AdditionalDocumentAdder.add(content, subjectId, 'captionTrack, Json.obj("kind" -> kind)) { _ => Ok(subjectId) }
                      case None =>
                        Future(InternalServerError("Could not create resource"))
                    }
                  case None =>
                   Future(InternalServerError("Could not upload file"))
                }
              } else {
                //TODO: Check permissions
                // Figure out which file we are replacing
                // First get the resource
                ResourceController.getResource(resourceId).flatMap {
                  case Some(json) =>
                    val resource = json \ "resource"
                    
                    // Now find the file
                    val url = ((resource \ "content" \ "files")(0) \ "downloadUri").as[String]
                    val name = url.substring(url.lastIndexOf("/") + 1)
                    
                    // Replace the file
                    FileUploader.uploadFile(file, name, mime).flatMap {
                      case Some(url) =>
                        // Handle updating the information.
                        val updatedFile = (resource \ "content" \ "files")(0).as[JsObject] ++ Json.obj(
                            "bytes" -> size
                            // "attributes" -> Json.obj("kind" -> kind) //How do we do this up above?
                        )
                        val updatedResource = resource.as[JsObject] ++ Json.obj(
                          "title" -> label,
                          "type" -> "document",
                          "languages" -> Json.obj(
                            "iso639_3" -> languages
                          ),
                          "content" -> Json.obj("files" -> List(updatedFile))
                        )
                        ResourceController.updateResource(resourceId, updatedResource).map {
                          case Some(json) => 
                            Async{ 
                              AdditionalDocumentAdder.edit(content, resourceId, 'captionTrack, Json.obj("kind" -> kind)) { 
                                _ => Ok(resourceId) 
                              }
                            }                          
                          case None => InternalServerError("Could not update resource")
                        }
                      
                      case None => Future(InternalServerError("Could not replace file"))
                    }
                  case None => Future(InternalServerError("Could not access resource"))
                }
              }
            }
          }.getOrElse {
            BadRequest
          }
        }
    }
}
