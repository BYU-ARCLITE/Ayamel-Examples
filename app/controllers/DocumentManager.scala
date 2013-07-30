package controllers

import play.api.mvc.{RequestHeader, Result, Controller}
import controllers.authentication.Authentication
import service.{DocumentPermissionChecker, AdditionalDocumentAdder, ResourceHelper, FileUploader}
import java.io.{InputStream, ByteArrayInputStream}
import scala.concurrent.Future
import scala.concurrent.ExecutionContext
import ExecutionContext.Implicits.global
import models.{User, Content, Course}
import dataAccess.ResourceController
import play.api.libs.json.{JsArray, JsObject, Json}

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
        ContentController.getContent(id) {
          content =>
            Ok(views.html.content.annotationEditor(content, ResourceController.baseUrl))
        }
  }

  /**
   * Helper function which creates annotations
   * @param stream The data stream to save in a file
   * @param filename The filename of the annotation set
   * @param length The length of the stream
   * @param mime The MIME type of the file to be saved
   * @param title The title of the annotation set
   * @param languages The languages of the annotation set
   * @param content The content with which the annotations will be associated
   * @return The result
   */
  def createAnnotations(stream: InputStream, filename: String, length: Long, mime: String, title: String,
                        languages: List[String], content: Content)(callback: Result)
                       (implicit request: RequestHeader, user: User): Future[Result] = {

    // First upload the annotation data
    FileUploader.uploadStream(stream, filename, length, mime).flatMap {
      url =>

      // Next create a resource
        val resource = ResourceHelper.make.resource(Json.obj(
          "title" -> title,
          "keywords" -> "annotations",
          "type" -> "text",
          "languages" -> Json.obj(
            "iso639_3" -> languages
          )
        ))
        ResourceHelper.createResourceWithUri(resource, url, length, mime).flatMap {
          resource =>
            val subjectId = (resource \ "id").as[String]

            // Add a relation
            AdditionalDocumentAdder.add(content, subjectId, 'annotations) {
              course =>
                callback
            }
        }
    }
  }

  /**
   * Helper function which updates annotations
   * @param stream The data stream to save
   * @param filename The filename of the file
   * @param length The length of the stream
   * @param mime The MIME type of the file
   * @param resourceId The ID of the resource that will be updated
   * @param title The title of the annotation set
   * @param languages The languages of the annotation set
   */
  def updateAnnotations(stream: InputStream, filename: String, length: Long, mime: String, resourceId: String,
                        title: String, languages: List[String]) {
    // Update the data
    FileUploader.uploadStream(stream, filename, length, mime)

    // Update the resource
    ResourceController.updateResource(resourceId, Json.obj(
      "title" -> title,
      "languages" -> Json.obj(
        "iso639_3" -> languages
      )
    ))
  }

  /**
   * AJAX endpoint which saves the annotation set.
   * @param id The ID of the content with which the annotations will be associated
   */
  def saveAnnotations(id: Long) = Authentication.authenticatedAction(parse.multipartFormData) {
    implicit request =>
      implicit user =>
        ContentController.getContent(id) {
          content =>
            val data = request.body.dataParts.mapValues(_(0))
            val title = data("title")
            val annotations = data("annotations")
            val stream = new ByteArrayInputStream(annotations.getBytes("UTF-8"))
            val length = annotations.getBytes("UTF-8").size // Don't use string length. Breaks if there are 2-byte characters
          val mime = "application/json"
            val filename = data.get("filename").getOrElse(FileUploader.uniqueFilename(annotations + ".json"))
            val languages = List(data("language"))
            val resourceId = data("resourceId")
            val course = request.queryString.get("course").flatMap(id => Course.findById(id(0).toLong))

            Async {

              if (resourceId.isEmpty) {
                // We are uploading a new thing
                createAnnotations(stream, filename, length, mime, title, languages, content) {
                  Ok
                }
              } else {
                // We are updating. Check that we are allowed to do this
                val checker = new DocumentPermissionChecker(user, content, course, DocumentPermissionChecker.documentTypes.annotations)
                ResourceController.getResource(resourceId).map {
                  data =>
                    if (checker.canEdit((data \ "resource").as[JsObject])) {

                      // We are, so create a new annotation set
                      updateAnnotations(stream, filename, length, mime, resourceId, title, languages)
                      Ok
                    } else {
                      Forbidden
                    }
                }
              }
            }
        }
  }

  /**
   * Requests for a document to be published.
   * @param id The ID of the content
   * @param docId The ID of the resource to publish
   */
  def publishDocument(id: Long, docId: String) = Authentication.authenticatedAction() {
    implicit request =>
      implicit user =>
        ContentController.getContent(id) {
          content =>

            Async {
              ResourceHelper.setAttributes(docId, Map("publishStatus" -> "requested")).map {
                json =>

                // Notify the owner
                  val contentUrl = routes.ContentController.view(id).toString()
                  val message = "A request has been made to publish a document on your content <a href=\"" + contentUrl + "\">" + content.name + "</a>."
                  content.getOwner.sendNotification(message)

                  val courseId = request.queryString.get("course").map(_(0).toLong)
                  (
                    if (courseId.isDefined)
                      Redirect(routes.CourseContent.viewInCourse(id, courseId.get))
                    else
                      Redirect(routes.ContentController.view(id))
                    ).flashing("info" -> "A publish request has been made.")
              }
            }
        }
  }

  /**
   * Accepts a document's publish request
   * @param id The ID of the content
   * @param docId The ID of the resource being published
   */
  def acceptDocument(id: Long, docId: String) = Authentication.authenticatedAction() {
    implicit request =>
      implicit user =>
        ContentController.getContent(id) {
          content =>

            if (content isEditableBy user) {
              Async {

                // Accept the document by removing the publishRequested attribute and removing attributes on the relation
                val attributes = Map(
                  "publishStatus" -> "accepted",
                  "ayamel_ownerType" -> "",
                  "ayamel_ownerId" -> ""
                )
                ResourceHelper.setAttributes(docId, attributes).map {
                  json =>

                    val courseId = request.queryString.get("course").map(_(0).toLong)
                    (
                      if (courseId.isDefined)
                        Redirect(routes.CourseContent.viewInCourse(id, courseId.get))
                      else
                        Redirect(routes.ContentController.view(id))
                      ).flashing("info" -> "The document has been accepted. However, it has not been enabled.")
                }
              }
            } else
              Errors.forbidden
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
        ContentController.getContent(id) {
          content =>

            if (content isEditableBy user) {
              Async {

                // Get the list of relations this resource is in and delete them
                ResourceController.getRelations(docId).map(result => {
                  val relations = (result \ "relations").as[JsArray].value
                  relations.foreach(relation => ResourceController.deleteRelation((relation \ "id").as[String]))
                })

                // Delete this resource
                ResourceController.deleteResource(docId).map(result => {

                  // Redirect back
                  val courseId = request.queryString.get("course").map(_(0).toLong)
                  (
                    if (courseId.isDefined)
                      Redirect(routes.CourseContent.viewInCourse(id, courseId.get))
                    else
                      Redirect(routes.ContentController.view(id))
                    ).flashing("info" -> "The document has been deleted.")
                })
              }
            } else
              Errors.forbidden
        }
  }

}
