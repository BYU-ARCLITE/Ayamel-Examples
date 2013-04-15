package controllers

import authentication.Authentication
import play.api.mvc.{Action, Result, Request, Controller}
import service._
import models.{Course, User, Content}
import play.api.Play
import Play.current
import play.api.libs.json.Json
import concurrent.ExecutionContext
import ExecutionContext.Implicits.global
import anorm.NotAssigned
import play.api.libs.json.JsArray
import play.api.libs.json.JsString
import scala.Some
import service.ContentDescriptor
import dataAccess.{PlayGraph, ResourceController}

/**
 * The controller for dealing with content.
 */
object ContentController extends Controller {

  /**
   * Action mix-in to get the content from the request
   */
  def getContent(id: Long)(f: Content => Result)(implicit request: Request[_]) = {
    val content = Content.findById(id)
    if (content.isDefined) {
      f(content.get)
    } else
      Errors.notFound
  }

  def getAsJson(id: Long) = Authentication.authenticatedAction() {
    implicit request =>
      implicit user =>
        getContent(id) {
          content =>

            // A user can get the JSON if he can see the content or has provided the auth key (sharing)
            val authKey = request.queryString.get("authKey").getOrElse("")
            if (content.isVisibleBy(user) || (content.shareability != Content.shareability.notShareable && content.authKey == authKey))
              Ok(content.toJson)
            else
              Forbidden

        }
  }

  /**
   * Content creation page
   */
  def createPage(page: String = "file") = Authentication.authenticatedAction() {
    implicit request =>
      implicit user =>
        // Guests cannot create content
        Authentication.enforceNotRole(User.roles.guest) {
          if (page == "url")
            Ok(views.html.content.create.url())
          else if (page == "resource")
            Ok(views.html.content.create.resource())
          else if (page == "playlist")
            Ok(views.html.content.create.playlist())
          else
            Ok(views.html.content.create.file())
        }
  }

  /**
   * Creates content based on the posted data (URL)
   */
  def createFromUrl = Authentication.authenticatedAction(parse.urlFormEncoded) {
    implicit request =>
      implicit user =>

        // Guests cannot create content
        Authentication.enforceNotRole(User.roles.guest) {
          // Collect the information
          val data = request.body
          val contentType = Symbol(data("contentType")(0))
          val title = data("title")(0)
          val description = data("description")(0)
          val keywords = data("keywords")(0)
          val categories = data.get("categories").map(_.toList).getOrElse(Nil)
          val url = data("url")(0)
          val mime = ResourceHelper.getMimeFromUri(url)

          // Create the content
          val info = ContentDescriptor(title, description, keywords, categories, url, mime)
          ContentManagement.createContent(info, user, contentType)

          Redirect(routes.Application.home()).flashing("success" -> "Content added")
        }
  }

  /**
   * Creates content based on the posted data (File)
   */
  def createFromFile = Authentication.authenticatedAction(parse.multipartFormData) {
    implicit request =>
      implicit user =>

        // Guests cannot create content
        Authentication.enforceNotRole(User.roles.guest) {

          // Collect the information
          val data = request.body.dataParts
          val contentType = Symbol(data("contentType")(0))
          val title = data("title")(0)
          val description = data("description")(0)
          val keywords = data("keywords")(0)
          val categories = data.get("categories").map(_.toList).getOrElse(Nil)

          Async {
            // Upload the file
            val file = request.body.file("file").get
            FileUploader.normalizeAndUploadFile(file).flatMap { url =>

                // Create the content
                val info = ContentDescriptor(title, description, keywords, categories, url, file.contentType.get)
                ContentManagement.createContent(info, user, contentType).map {
                  content =>
                    Redirect(routes.ContentController.view(content.id.get))flashing("success" -> "Content added")
                }
            }
          }
        }
  }

  /**
   * Creates content based on the posted data (File)
   */
  def createFromResource = Authentication.authenticatedAction(parse.urlFormEncoded) {
    implicit request =>
      implicit user =>

        // Guests cannot create content
        Authentication.enforceNotRole(User.roles.guest) {

          // Create from resource
          val resourceId = request.body("resourceId")(0)
          Async {
            ResourceController.getResource(resourceId).map {
              json =>
                val code = (json \ "response" \ "code").as[Int]
                if (code == 200) {
                  val title = (json \ "resource" \ "title").as[String]
                  val contentType = (json \ "resource" \ "type").as[String]
                  val content = Content(NotAssigned, title, Symbol(contentType), "", resourceId).save
                  user.addContent(content)

                  Redirect(routes.ContentController.view(content.id.get))
                } else
                  Redirect(routes.ContentController.createPage("resource")).flashing("error" -> "That resource doesn't exist")
            }
          }
        }
  }

  /**
   * Creates content based on the posted data (File)
   */
  def createPlaylist = Authentication.authenticatedAction(parse.urlFormEncoded) {
    implicit request =>
      implicit user =>

        // Guests cannot create content
        Authentication.enforceNotRole(User.roles.guest) {

          Async {
            // Create the node content
            val nodeContent = SerializationTools.serializeMap(Map("status" -> "started"))
            PlayGraph.Author.NodeContent.create(nodeContent).flatMap(nodeContentJson => {
              val nodeContentId = (nodeContentJson \ "nodeContent" \ "id").as[Long]

              // Create the node
              PlayGraph.Author.Node.create(nodeContentId, "data", "0").flatMap(nodeJson => {
                val nodeId = (nodeJson \ "node" \ "id").as[Long]

                // Create the graph
                PlayGraph.Author.Graph.create(nodeId).map(graphJson => {
                  val graphId = (graphJson \ "graph" \ "id").as[Long]

                  // Create playlist
                  val title = request.body("title")(0)
                  val content = Content(NotAssigned, title, 'playlist, "", graphId.toString).save
                  user.addContent(content)

                  Redirect(routes.ContentController.view(content.id.get))
                })
              })
            })
          }
        }
  }

  /**
   * Content view page
   */
  def view(id: Long) = Authentication.authenticatedAction() {
    implicit request =>
      implicit user =>
        getContent(id) {
          content =>

            // Check that the user can view the content
            if (content isVisibleBy user) {
              val resourceLibraryUrl = Play.configuration.getString("resourceLibrary.baseUrl").get
              Ok(views.html.content.view(content, resourceLibraryUrl))
            } else
              Errors.forbidden
        }
  }

  def shareAccess(id: Long, authKey: String) = Action {
    implicit request =>
      getContent(id) {
        content =>

          // Check that everything is in place to view the content
          if (content.authKey == authKey && content.shareability != Content.shareability.notShareable) {
            val resourceLibraryUrl = Play.configuration.getString("resourceLibrary.baseUrl").get
            val embed = request.queryString.get("embed").map(_(0).toBoolean).getOrElse(false)
            Ok(views.html.content.share.view(content, resourceLibraryUrl, embed))
          } else
            Ok("You are not allowed to view this content")
      }
  }

  /**
   * Content view in course page
   */
  def viewInCourse(id: Long, courseId: Long) = Authentication.authenticatedAction() {
    implicit request =>
      implicit user =>
        getContent(id) {
          content =>
            Courses.getCourse(courseId) {
              course =>

                // Check that the user can view the content
                if (content isVisibleBy user) {
                  val resourceLibraryUrl = Play.configuration.getString("resourceLibrary.baseUrl").get
                  Ok(views.html.content.view(content, resourceLibraryUrl, Some(course)))
                } else
                  Errors.forbidden
            }
        }
  }

  /**
   * Content deletion endpoint
   */
  def delete(id: Long) = Authentication.authenticatedAction() {
    implicit request =>
      implicit user =>
        getContent(id) {
          content =>

            // Make sure the user is able to edit
            if (content isEditableBy user) {
              content.delete()
              Redirect(routes.ContentController.mine()).flashing("success" -> "Content deleted.")
            } else
              Errors.forbidden
        }
  }

  /**
   * "My Content" page
   */
  def mine = Authentication.authenticatedAction() {
    implicit request =>
      implicit user =>

        // Guests cannot create content
        Authentication.enforceNotRole(User.roles.guest) {
          Ok(views.html.content.mine())
        }
  }

  /**
   * Public content page
   */
  def public = Authentication.authenticatedAction() {
    implicit request =>
      implicit user =>
        val content = Content.listPublic
        Ok(views.html.content.public(content))
  }

  def setMetadata(id: Long) = Authentication.authenticatedAction(parse.urlFormEncoded) {
    implicit request =>
      implicit user =>
        getContent(id) {
          content =>

           // Make sure the user is able to edit
            if (content isEditableBy user) {

              // Get the info from the form
              val title = request.body("title")(0)
              val description = request.body("description")(0)
              val keywords = request.body("keywords")(0)
              val categories = request.body("categories")

              // Create the JSON object
              val obj = Json.obj(
                "title" -> title,
                "description" -> description,
                "keywords" -> keywords,
                "categories" -> JsArray(categories.map(c => JsString(c)))
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
        getContent(id) {
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
        getContent(id) {
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

  def setVideoSettings(content: Content, course: Option[Course] = None)(implicit request: Request[Map[String, Seq[String]]]) {
    val prefix = course.map(c => "course_" + c.id.get + ":").getOrElse("")
    val level = request.body("level")(0)
    val enabledCaptionTracks = request.body("captionTracks").mkString(",")

    content.setSetting(prefix + "level", level).save
    content.setSetting(prefix + "enabledCaptionTracks", enabledCaptionTracks).save
  }

  def setAudioSettings(content: Content, course: Option[Course] = None)(implicit request: Request[Map[String, Seq[String]]]) {

  }

  def setImageSettings(content: Content, course: Option[Course] = None)(implicit request: Request[Map[String, Seq[String]]]) {

  }

  def setSettings(id: Long) = Authentication.authenticatedAction(parse.urlFormEncoded) {
    implicit request =>
      implicit user =>
        getContent(id) {
          content =>

          // Make sure the user is able to edit
            if (content isEditableBy user) {
              val contentType = Symbol(request.body("contentType")(0))
              if (contentType == 'video)
                setVideoSettings(content)
              if (contentType == 'audio)
                setAudioSettings(content)
              if (contentType == 'image)
                setImageSettings(content)

              Redirect(routes.ContentController.view(id)).flashing("success" -> "Settings updated.")
            } else
              Errors.forbidden
        }
  }

  def setCourseSettings(id: Long, courseId: Long) = Authentication.authenticatedAction(parse.urlFormEncoded) {
    implicit request =>
      implicit user =>
        getContent(id) {
          content =>
            Courses.getCourse(courseId) {
              course =>

              // Make sure the user is able to edit the course
                if (user canEdit course) {
                  val contentType = Symbol(request.body("contentType")(0))
                  if (contentType == 'video)
                    setVideoSettings(content, Some(course))
                  if (contentType == 'audio)
                    setAudioSettings(content, Some(course))
                  if (contentType == 'image)
                    setImageSettings(content, Some(course))

                  Redirect(routes.ContentController.viewInCourse(id, course.id.get)).flashing("success" -> "Settings updated.")
                } else
                  Errors.forbidden
            }
        }
  }

  def editImage(id: Long) = Authentication.authenticatedAction() {
    implicit request =>
      implicit user =>
        getContent(id) {
          content =>
            if (content isEditableBy user) {
              if (content.contentType == 'image) {
                val resourceLibraryUrl = Play.configuration.getString("resourceLibrary.baseUrl").get
                Ok(views.html.content.editImage(content, resourceLibraryUrl))
              } else
                Errors.forbidden
            } else
              Errors.forbidden
        }
  }

  def saveImageEdits(id: Long) = Authentication.authenticatedAction(parse.urlFormEncoded) {
    implicit request =>
      implicit user =>
        getContent(id) {
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
                  ImageTools.loadImageFromContent(content).flatMap { image =>

                    // Make the changes to the image
                    val newImage = ImageTools.crop(
                      if (rotation > 0) ImageTools.rotate(image, rotation) else image,
                      cropTop, cropLeft, cropBottom, cropRight
                    )

                    // Save the new image
                    FileUploader.uploadImage(newImage, FileUploader.uniqueFilename(content.resourceId + ".jpg")).flatMap { url =>

                      // Update the resource
                      ResourceHelper.updateDownloadUri(content.resourceId, url).map { resource =>
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

  def addCaptionTrack(id: Long) = Authentication.authenticatedAction(parse.multipartFormData) {
    implicit request =>
      implicit user =>
        getContent(id) {
          content =>
            if (content isEditableBy user) {
              if (content.contentType == 'video || content.contentType == 'audio) {

                // Get the mime type
                val subtitleMimes = Map(
                  "srt" -> "text/plain",
                  "vtt" -> "text/vtt"
                )
                val file = request.body.file("file").get
                val ext = file.filename.substring(file.filename.lastIndexOf(".") + 1)
                val mime = subtitleMimes(ext)

                // Get the title and language
                val title = request.body.dataParts("title")(0)
                val language = request.body.dataParts("language")(0)

                Async {
                  // Upload the file
                  FileUploader.uploadFile(file.ref.file, FileUploader.uniqueFilename(file.filename), mime).flatMap { url =>

                    // Create subtitle (subject) resource
                    ResourceHelper.createResourceWithUri(title, "", "subtitles", Nil, "text", url, mime, language).flatMap { resource =>

                      // Have this caption track enabled
                      val subjectId = (resource \ "id").as[String]
                      val captionTracks = subjectId :: content.videoSettings.enabledCaptionTracks
                      content.setSetting("enabledCaptionTracks", captionTracks.mkString(",")).save

                      // Add the relation
                      ResourceController.addRelation("1", subjectId, content.resourceId, "transcriptOf", Map()).map(r => {
                        Redirect(routes.ContentController.view(content.id.get)).flashing("info" -> "Transcript added")
                      })
                    }
                  }
                }

              } else
                Errors.forbidden
            } else
              Errors.forbidden
        }
  }

  def addToCourse(id: Long) = Authentication.authenticatedAction(parse.urlFormEncoded) {
    implicit request =>
      implicit user =>
        getContent(id) {
          content =>

            val courseId = request.body("course")(0).toLong
            Courses.getCourse(courseId) {
              course =>

                course.addContent(content)
                Redirect(routes.ContentController.view(id)).flashing("info" -> "Content added to course")
            }
        }
  }
}
