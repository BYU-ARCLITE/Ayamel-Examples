package controllers

import play.api.mvc._
import controllers.authentication.Authentication
import service.{DocumentPermissionChecker, AdditionalDocumentAdder, ResourceHelper, FileUploader}
import java.io.{InputStream, ByteArrayInputStream}
import scala.concurrent.Future
import scala.concurrent.ExecutionContext
import ExecutionContext.Implicits.global
import models.{User, Content, Course}
import dataAccess.ResourceController
import play.api.libs.json._

/**
 * Controller that deals with documents (annotation sets and caption tracks)
 */
object DocumentManager extends Controller {

  /**
   * Annotation editor view
   */
  def editAnnotations(id: Long) = Authentication.authenticatedAction() {
    implicit request =>
      implicit user =>
        ContentController.getContent(id) { content =>
          Ok(views.html.content.annotationEditor(content, ResourceController.baseUrl))
        }
  }

  /**
   * AJAX endpoint which saves the annotation set.
   */
  def saveAnnotations = Authentication.authenticatedAction(parse.multipartFormData) {
    implicit request =>
      implicit user =>
        val params = request.body.dataParts.mapValues(_(0))
        val contentId = params("contentId").toLong
        ContentController.getContent(contentId) { content =>
          request.body.file("file").map { tmpFile =>
            val title = params("title")
            val languages = List(params("language"))

            // We need to determine if this file has already been saved
            val resourceId = params.getOrElse("resourceId","")

            val mime = tmpFile.contentType.getOrElse("application/json")
            val file = tmpFile.ref.file
            val size = file.length()

            Async {
              if (resourceId.isEmpty) {
                // We are uploading a new thing
                // First upload the annotation data
                val name = FileUploader.uniqueFilename(tmpFile.filename, ".json")
                FileUploader.uploadFile(file, name, mime).flatMap {
                  case Some(url) =>
                    // Next create a resource
                    val resource = ResourceHelper.make.resource(Json.obj(
                      "title" -> title,
                      "keywords" -> "annotations",
                      "type" -> "data",
                      "languages" -> Json.obj(
                        "iso639_3" -> languages
                      )
                    ))
                    ResourceHelper.createResourceWithUri(resource, url, size, mime).flatMap {
                      case Some(json) =>
                        val subjectId = (json \ "id").as[String]
                        AdditionalDocumentAdder.add(content, subjectId, 'annotations) { _ => Ok(subjectId) }
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
                        )
                        val updatedResource = resource.as[JsObject] ++ Json.obj(
                          "title" -> title,
                          "languages" -> Json.obj(
                            "iso639_3" -> languages
                          ),
                          "content" -> Json.obj("files" -> List(updatedFile))
                        )
                        ResourceController.updateResource(resourceId, updatedResource).map {
                          case Some(json) => Ok(resourceId)
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

  /**
   * Deletes a document
   * @param id The ID of the content
   * @param docId The ID of resource being deleted
   */
  def deleteDocument(id: Long, docId: String) = Authentication.authenticatedAction() {
    implicit request =>
      implicit user =>
        ContentController.getContent(id) { content =>
          if (content isEditableBy user) {
            Async {
              // Get the list of relations this resource is in and delete them
              for(result <- ResourceController.getRelations(docId);
                  json <- result;
                  relation <- ((json \ "relations").as[JsArray].value)
              ) {
                ResourceController.deleteRelation((relation \ "id").as[String])
              }

              // Delete this resource
              ResourceController.deleteResource(docId).map { _ =>
                Redirect(request.queryString.get("course").map(_(0).toLong) match {
                  case Some(courseId) => routes.CourseContent.viewInCourse(id, courseId)
                  case None => routes.ContentController.view(id)
                }).flashing("info" -> "The document has been deleted.")
              }
            }
          } else
            Errors.forbidden
      }
  }

}
