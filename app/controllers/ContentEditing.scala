package controllers

import play.api.mvc.{Request, Controller}
import controllers.authentication.Authentication
import play.api.libs.json.{JsString, JsArray, Json}
import dataAccess.ResourceController
import models.{User, Course, Content}
import service.{VideoTools, ResourceHelper, FileUploader, ImageTools}
import javax.imageio.ImageIO
import scala.concurrent.ExecutionContext
import ExecutionContext.Implicits.global

/**
 * Controller that deals with the editing of content
 */
object ContentEditing extends Controller {

  /**
   * Sets the metadata for a particular content object
   * @param id The ID of the content
   */
  def setMetadata(id: Long) = Authentication.authenticatedAction(parse.urlFormEncoded) {
    implicit request =>
      implicit user =>
        ContentController.getContent(id) {
          content =>

          // Make sure the user is able to edit
            if (content isEditableBy user) {

              // Get the info from the form
              val title = request.body("title")(0)
              val description = request.body("description")(0)
              val categories = request.body.get("categories").map(_.toList).getOrElse(Nil)
              val labels = request.body.get("labels").map(_.toList).getOrElse(Nil)
              val keywords = labels.mkString(",")
              val languages = request.body.get("languages").map(_.toList).getOrElse(List("eng"))

              // Update the name and labels of the content
              content.copy(name = title, labels = labels).save

              // Create the JSON object
              val obj = Json.obj(
                "title" -> title,
                "description" -> description,
                "keywords" -> keywords,
//                "categories" -> JsArray(categories.map(c => JsString(c))),
                "languages" -> Json.obj(
                  "iso639_3" -> languages
                )
              )

              // Save the metadata
              ResourceController.updateResource(content.resourceId, obj)

              Redirect(routes.ContentController.view(id)).flashing("success" -> "Metadata updated.")
            } else
              Errors.forbidden
        }
  }

  /**
   * Set content visibility endpoint
   */
  def setVisibility(id: Long) = Authentication.authenticatedAction(parse.urlFormEncoded) {
    implicit request =>
      implicit user =>
        ContentController.getContent(id) {
          content =>

          // Make sure the user is able to edit
            if (content isEditableBy user) {
              val visibility = request.body("visibility")(0).toInt
              content.copy(visibility = visibility).save
              Redirect(routes.ContentController.view(id)).flashing("success" -> "Visibility updated.")
            } else
              Errors.forbidden
        }
  }

  /**
   * Set content shareability endpoint
   */
  def setShareability(id: Long) = Authentication.authenticatedAction(parse.urlFormEncoded) {
    implicit request =>
      implicit user =>
        ContentController.getContent(id) {
          content =>

          // Make sure the user is able to edit
            if (content isEditableBy user) {
              val shareability = request.body("shareability")(0).toInt
              content.copy(shareability = shareability).save
              Redirect(routes.ContentController.view(id)).flashing("success" -> "Shareability updated.")
            } else
              Errors.forbidden
        }
  }

  /**
   * Helper function which sets audio/video settings
   * @param content The content whose settings are being set
   * @param course If set, then course settings are being set for this course
   * @param user If set, then personal settings are being set for this user
   */
  def setAudioVideoSettings(content: Content, course: Option[Course] = None, user: Option[User] = None)(implicit request: Request[Map[String, Seq[String]]]) {
    val prefix = course.map(c => "course_" + c.id.get + ":")
      .getOrElse(user.map(u => "user_" + u.id.get + ":").getOrElse(""))
    val level = request.body("level")(0)
    val enabledCaptionTracks = request.body.get("captionTracks").map(_.mkString(",")).getOrElse("")
    val enabledAnnotationDocuments = request.body.get("annotationDocs").map(_.mkString(",")).getOrElse("")
    val includeTranscriptions = request.body.get("includeTranscriptions").map(_(0)).getOrElse("false")

    content.setSetting(prefix + "level", level)
      .setSetting(prefix + "enabledCaptionTracks", enabledCaptionTracks)
      .setSetting(prefix + "enabledAnnotationDocuments", enabledAnnotationDocuments)
      .setSetting(prefix + "includeTranscriptions", includeTranscriptions).save
  }

  /**
   * Helper function which sets image settings
   * @param content The content whose settings are being set
   * @param course If set, then course settings are being set for this course
   * @param user If set, then personal settings are being set for this user
   */
  def setImageSettings(content: Content, course: Option[Course] = None, user: Option[User] = None)(implicit request: Request[Map[String, Seq[String]]]) {
    val prefix = course.map(c => "course_" + c.id.get + ":")
      .getOrElse(user.map(u => "user_" + u.id.get + ":").getOrElse(""))
    val enabledAnnotationDocuments = request.body.get("annotationDocs").map(_.mkString(",")).getOrElse("")
    content.setSetting(prefix + "enabledAnnotationDocuments", enabledAnnotationDocuments).save
  }

  /**
   * Helper function which sets text settings
   * @param content The content whose settings are being set
   * @param course If set, then course settings are being set for this course
   * @param user If set, then personal settings are being set for this user
   */
  def setTextSettings(content: Content, course: Option[Course] = None, user: Option[User] = None)(implicit request: Request[Map[String, Seq[String]]]) {
    val prefix = course.map(c => "course_" + c.id.get + ":")
      .getOrElse(user.map(u => "user_" + u.id.get + ":").getOrElse(""))
    val enabledAnnotationDocuments = request.body.get("annotationDocs").map(_.mkString(",")).getOrElse("")
    content.setSetting(prefix + "enabledAnnotationDocuments", enabledAnnotationDocuments).save
  }

  /**
   * Sets the content's settings
   * @param id The ID of the content
   */
  def setSettings(id: Long) = Authentication.authenticatedAction(parse.urlFormEncoded) {
    implicit request =>
      implicit user =>
        ContentController.getContent(id) {
          content =>

          // Make sure the user is able to edit
            if (content isEditableBy user) {
              val contentType = Symbol(request.body("contentType")(0))
              if (contentType == 'video || contentType == 'audio)
                setAudioVideoSettings(content)
              if (contentType == 'image)
                setImageSettings(content)
              if (contentType == 'text)
                setTextSettings(content)

              Redirect(routes.ContentController.view(id)).flashing("success" -> "Settings updated.")
            } else
              Errors.forbidden
        }
  }

  /**
   * Sets settings for content in the context of a particular course
   * @param id The ID of the content
   * @param courseId The ID of the course
   */
  def setCourseSettings(id: Long, courseId: Long) = Authentication.authenticatedAction(parse.urlFormEncoded) {
    implicit request =>
      implicit user =>
        ContentController.getContent(id) {
          content =>
            Courses.getCourse(courseId) {
              course =>

              // Make sure the user is able to edit the course
                if (user canEdit course) {
                  val contentType = Symbol(request.body("contentType")(0))
                  if (contentType == 'video || contentType == 'audio)
                    setAudioVideoSettings(content, Some(course))
                  if (contentType == 'image)
                    setImageSettings(content, Some(course))

                  Redirect(routes.CourseContent.viewInCourse(id, course.id.get)).flashing("success" -> "Settings updated.")
                } else
                  Errors.forbidden
            }
        }
  }

  /**
   * Sets personal settings for content
   * @param id The ID of the content
   */
  def setPersonalSettings(id: Long) = Authentication.authenticatedAction(parse.urlFormEncoded) {
    implicit request =>
      implicit user =>
        ContentController.getContent(id) {
          content =>

          // Make sure the user is able to edit the course
            val contentType = Symbol(request.body("contentType")(0))
            if (contentType == 'video || contentType == 'audio)
              setAudioVideoSettings(content, None, Some(user))
            if (contentType == 'image)
              setImageSettings(content, None, Some(user))

            Redirect(routes.ContentController.view(id)).flashing("success" -> "Settings updated.")
        }
  }

  /**
   * Image editing view
   * @param id The ID of the content
   */
  def editImage(id: Long) = Authentication.authenticatedAction() {
    implicit request =>
      implicit user =>
        ContentController.getContent(id) {
          content =>
            if (content isEditableBy user) {
              if (content.contentType == 'image) {
                Ok(views.html.content.editImage(content, ResourceController.baseUrl))
              } else
                Errors.forbidden
            } else
              Errors.forbidden
        }
  }

  /**
   * Saves the image edits.
   * @param id The id of the content
   */
  def saveImageEdits(id: Long) = Authentication.authenticatedAction(parse.urlFormEncoded) {
    implicit request =>
      implicit user =>
        ContentController.getContent(id) {
          content =>
            if (content isEditableBy user) {
              if (content.contentType == 'image) {

                // Get the rotation and crop info
                val rotation = request.body("rotation")(0).toInt
                val cropTop = request.body("cropTop")(0).toDouble
                val cropLeft = request.body("cropLeft")(0).toDouble
                val cropBottom = request.body("cropBottom")(0).toDouble
                val cropRight = request.body("cropRight")(0).toDouble

                // Load the image
                Async {
                  ImageTools.loadImageFromContent(content).flatMap {
                    image =>

                    // Make the changes to the image
                      val newImage = ImageTools.crop(
                        if (rotation > 0) ImageTools.rotate(image, rotation) else image,
                        cropTop, cropLeft, cropBottom, cropRight
                      )

                      // Save the new image
                      FileUploader.uploadImage(newImage, FileUploader.uniqueFilename(content.resourceId + ".jpg")).flatMap {
                        url =>

                        // Update the resource
                          ResourceHelper.updateDownloadUri(content.resourceId, url).map {
                            resource =>
                              Redirect(routes.ContentController.view(content.id.get)).flashing("info" -> "Image updated")
                          }
                      }
                  }
                }
              } else
                Errors.forbidden
            } else
              Errors.forbidden
        }
  }

  /**
   * Sets the thumbnail for content from either a URL or a file
   * @param id The ID of the content that the thumbnail will be for
   */
  def changeThumbnail(id: Long) = Authentication.authenticatedAction(parse.multipartFormData) {
    implicit request =>
      implicit user =>
        ContentController.getContent(id) {
          content =>

            val file = request.body.file("file").get
            val url = request.body.dataParts("url")(0)

            Async {
              if (url.isEmpty) {

                val image = ImageIO.read(file.ref.file)
                val thumbnail = ImageTools.makeThumbnail(image)
                FileUploader.uploadImage(thumbnail, FileUploader.uniqueFilename("thumbnail.jpg")).map {
                  thumbnailUrl =>
                    content.copy(thumbnail = thumbnailUrl).save
                    Redirect(routes.ContentController.view(content.id.get)).flashing("info" -> "Thumbnail changed")
                }
              } else {
                ImageTools.generateThumbnail(url).map {
                  thumbnailUrl =>
                    content.copy(thumbnail = thumbnailUrl).save
                    Redirect(routes.ContentController.view(content.id.get)).flashing("info" -> "Thumbnail changed")
                }
              }
            }
        }
  }

  /**
   * Creates a thumbnail for content from a particular point in time in a video
   * @param id The ID of the content
   * @param time The time in the video which will be used as the thumbnail
   */
  def createThumbnail(id: Long, time: Double) = Authentication.authenticatedAction() {
    implicit request =>
      implicit user =>
        ContentController.getContent(id) {
          content =>
            Async {

              // Get the video resource from the content
              ResourceController.getResource(content.resourceId).flatMap {
                json =>
                  val resource = json \ "resource"

                  // Get the video file
                  val videoUrl = ((resource \ "content" \ "files").as[JsArray].value.find(file =>
                    (file \ "mime").as[String].startsWith("video")
                  ).get \ "downloadUri").as[String]

                  // Generate the thumbnail for that video
                  VideoTools.generateThumbnail(videoUrl, time).map {
                    thumbnailUrl =>

                    // Save it and be done
                      content.copy(thumbnail = thumbnailUrl).save
                      Redirect(routes.ContentController.view(id)).flashing("info" -> "Thumbnail updated")
                  }
              }
            }
        }
  }

  /**
   * Sets the downloadUri of the primary resource associated with the content
   * @param id The ID of the content
   */
  def setMediaSource(id: Long) = Authentication.authenticatedAction(parse.urlFormEncoded) {
    implicit request =>
      implicit user =>
        ContentController.getContent(id) {
          content =>
            if (content isEditableBy user) {
              val url = request.body("url")(0)
              Async {
                ResourceHelper.updateDownloadUri(content.resourceId, url).map(json =>
                  Redirect(routes.ContentController.view(id)).flashing("info" -> "Media source updated")
                )
              }
            } else
              Errors.forbidden
        }
  }
}
