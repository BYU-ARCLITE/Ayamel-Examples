package controllers

import play.api.mvc.{RequestHeader, Result, Controller}
import controllers.authentication.Authentication
import service.{DocumentPermissionChecker, AdditionalDocumentAdder, ResourceHelper, FileUploader}
import play.api.Play
import play.api.Play.current
import java.io.{InputStream, ByteArrayInputStream}
import scala.concurrent.Future
import scala.concurrent.ExecutionContext
import ExecutionContext.Implicits.global
import models.{User, Content, Course}
import dataAccess.ResourceController
import play.api.libs.json.{JsObject, Json}

/**
 * Created with IntelliJ IDEA.
 * User: camman3d
 * Date: 5/8/13
 * Time: 1:01 PM
 * To change this template use File | Settings | File Templates.
 */
object DocumentManager extends Controller {

  def editAnnotations(id: Long) = Authentication.authenticatedAction() {
    implicit request =>
      implicit user =>
        ContentController.getContent(id) {
          content =>
            Ok(views.html.content.annotationEditor(content, ResourceController.baseUrl))
        }
  }

  def createAnnotations(stream: InputStream, filename: String, length: Long, mime: String, title: String,
                        languages: List[String], content: Content)(callback: Result)
                       (implicit request: RequestHeader, user: User): Future[Result] = {

    // First upload the annotation data
    FileUploader.uploadStream(stream, filename, length, mime).flatMap {
      url =>

        // Next create a resource
        ResourceHelper.createResourceWithUri(title, "", "annotations", Nil, "text", url, mime, languages).flatMap {
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

  def updateAnnotations(stream: InputStream, filename: String, length: Long, mime: String, resourceId: String,
                        title: String, languages: List[String]) {
    // Update the data
    FileUploader.uploadStream(stream, filename, length, mime)

    // Update the resource
    ResourceController.updateResource(resourceId, Json.obj(
      "title" -> title,
      "languages" -> languages
    ))
  }

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
//                  Redirect(
//                    if (course.isDefined) routes.CourseContent.viewInCourse(content.id.get, course.get.id.get)
//                    else routes.ContentController.view(content.id.get)
//                  ).flashing("info" -> "Annotations updated")
                }
              } else {
                // We are updating. Check that we are allowed to do this
                val checker = new DocumentPermissionChecker(user, content, course, DocumentPermissionChecker.documentTypes.annotations)
                ResourceController.getResource(resourceId).map { data =>
                  if (checker.canEdit((data \ "resource").as[JsObject])) {

                    // We are, so create a new annotation set
                    updateAnnotations(stream, filename, length, mime, resourceId, title, languages)
                    Ok
//                    Redirect(
//                      if (course.isDefined) routes.CourseContent.viewInCourse(content.id.get, course.get.id.get)
//                      else routes.ContentController.view(content.id.get)
//                    ).flashing("info" -> "Annotations updated")
                  } else {
                    Errors.forbidden
                  }
                }
              }
            }
        }
  }

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

}
