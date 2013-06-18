package controllers

import play.api.mvc.Controller
import controllers.authentication.Authentication
import service.{AdditionalDocumentAdder, ResourceHelper, FileUploader}
import play.api.Play
import play.api.Play.current
import java.io.ByteArrayInputStream
import scala.concurrent.Future
import scala.concurrent.ExecutionContext
import ExecutionContext.Implicits.global
import models.Course

/**
 * Created with IntelliJ IDEA.
 * User: camman3d
 * Date: 5/8/13
 * Time: 1:01 PM
 * To change this template use File | Settings | File Templates.
 */
object DocumentManager extends Controller {

//  val subtitleExtentionMimes = Map(
//    "vtt" -> "text/vtt",
//    "srt" -> "text/srt",
//    "ttml" -> "application/ttml+xml"
//  )
//
//  def addCaptionTrack(id: Long) = Authentication.authenticatedAction(parse.multipartFormData) {
//    implicit request =>
//      implicit user =>
//        ContentController.getContent(id) {
//          content =>
//
//            if (content.contentType == 'video || content.contentType == 'audio) {
//
//              // Get the mime type
//              val file = request.body.file("file").get
//              val ext = file.filename.substring(file.filename.lastIndexOf(".") + 1)
//              val mime = subtitleExtentionMimes(ext)
//
//              // Get the title and language
//              val title = request.body.dataParts("title")(0)
//              val language = request.body.dataParts("language")(0)
//
//              Async {
//                // Upload the file
//                FileUploader.uploadFile(file.ref.file, FileUploader.uniqueFilename(file.filename), mime).flatMap {
//                  url =>
//
//                    // Create subtitle (subject) resource
//                    ResourceHelper.createResourceWithUri(title, "", "subtitles", Nil, "text", url, mime, language).flatMap {
//                      resource =>
//                        val subjectId = (resource \ "id").as[String]
//
//                        AdditionalDocumentAdder.add(content, subjectId, 'captionTrack) {
//                          course =>
//                            val route =
//                              if (course.isDefined) routes.CourseContent.viewInCourse(content.id.get, course.get.id.get)
//                              else routes.ContentController.view(content.id.get)
//                            Redirect(route).flashing("info" -> "Caption track added")
//                        }
//                    }
//                }
//              }
//
//            } else
//              Errors.forbidden
//        }
//  }

  def addAnnotations(id: Long) = Authentication.authenticatedAction(parse.multipartFormData) {
    implicit request =>
      implicit user =>
        ContentController.getContent(id) {
          content =>

            val file = request.body.file("file").get
            val mime = "application/json"
            val title = request.body.dataParts("title")(0)

            // TODO: Handle the language of the annotations
            val languages = List("eng")

            Async {
              // Upload the file
              FileUploader.uploadFile(file.ref.file, FileUploader.uniqueFilename(file.filename), mime).flatMap {
                url =>

                // Create subtitle (subject) resource
                  ResourceHelper.createResourceWithUri(title, "", "annotations", Nil, "text", url, mime, languages).flatMap {
                    resource =>
                      val subjectId = (resource \ "id").as[String]
                      AdditionalDocumentAdder.add(content, subjectId, 'annotations) {
                        course =>
                          val route =
                            if (course.isDefined) routes.CourseContent.viewInCourse(content.id.get, course.get.id.get)
                            else routes.ContentController.view(content.id.get)
                          Redirect(route).flashing("info" -> "Annotations added")
                      }
                  }
              }
            }
        }
  }

  def editAnnotations(id: Long) = Authentication.authenticatedAction() {
    implicit request =>
      implicit user =>
        ContentController.getContent(id) {
          content =>
            val resourceLibraryUrl = Play.configuration.getString("resourceLibrary.baseUrl").get
            Ok(views.html.content.annotationEditor(content, resourceLibraryUrl))
        }
  }

  def saveAnnotations(id: Long) = Authentication.authenticatedAction(parse.urlFormEncoded) {
    implicit request =>
      implicit user =>
        ContentController.getContent(id) {
          content =>
            val title = request.body.get("title").map(_(0))
            val annotations = request.body("annotations")(0)
            val stream = new ByteArrayInputStream(annotations.getBytes("UTF-8"))
            val length = annotations.getBytes("UTF-8").size // Don't use string length. Breaks if there are 2-byte characters
            val mime = "application/json"
            val filename = request.body.get("filename").map(_(0)).getOrElse(FileUploader.uniqueFilename(annotations + ".json"))

            // TODO: Handle the language of the annotations
            val languages = List("eng")

            Async {
              // Upload the annotations
              // TODO: Somehow make sure that the user isn't overwriting somebody else's annotations
              FileUploader.uploadStream(stream, filename, length, mime).flatMap {
                url =>

                // If there is a title defined then this is a new annotation document
                  if (title.isDefined) {
                    // Create subtitle (subject) resource
                    ResourceHelper.createResourceWithUri(title.get, "", "annotations", Nil, "text", url, mime, languages).flatMap {
                      resource =>
                        val subjectId = (resource \ "id").as[String]

                        AdditionalDocumentAdder.add(content, subjectId, 'annotations) {
                          course =>
                            val route =
                              if (course.isDefined) routes.CourseContent.viewInCourse(content.id.get, course.get.id.get)
                              else routes.ContentController.view(content.id.get)
                            Redirect(route).flashing("info" -> "Annotations added")
                        }
                    }
                  } else {

                    // We are just updating
                    Future {
                      val course = request.body.get("course").flatMap(id => Course.findById(id(0).toLong))
                      Redirect(
                        if (course.isDefined) routes.CourseContent.viewInCourse(content.id.get, course.get.id.get)
                        else routes.ContentController.view(content.id.get)
                        ).flashing("info" -> "Annotations updated")
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
                  val message = "A request has been made to publish a document on your content <a href=\"" + contentUrl +
                    "\">" + content.name + "</a>."
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
