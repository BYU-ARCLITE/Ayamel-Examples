package controllers

import authentication.Authentication
import play.api.mvc.{Action, Result, Request, Controller}
import service._
import models.{Course, User, Content}
import play.api.Play
import Play.current
import play.api.libs.json.Json
import scala.concurrent.{Future, ExecutionContext}
import ExecutionContext.Implicits.global
import anorm.NotAssigned
import play.api.libs.json.JsArray
import play.api.libs.json.JsString
import scala.Some
import service.ContentDescriptor
import dataAccess.{PlayGraph, ResourceController}
import java.io.ByteArrayInputStream
import javax.imageio.ImageIO
import play.core.parsers.FormUrlEncodedParser

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
          val labels = data.get("labels").map(_.toList).getOrElse(Nil)
          val url = data("url")(0)
          val mime = ResourceHelper.getMimeFromUri(url)

          // Create the content
          val info = ContentDescriptor(title, description, keywords, categories, url, mime, labels = labels)
          Async {
            ContentManagement.createContent(info, user, contentType).map(content => {
              Redirect(routes.ContentController.view(content.id.get)).flashing("success" -> "Content added")
            })
          }
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
          val labels = data.get("labels").map(_.toList).getOrElse(Nil)

          Async {
            // Upload the file
            val file = request.body.file("file").get
            FileUploader.normalizeAndUploadFile(file).flatMap { url =>

                // Create the content
                val info = ContentDescriptor(title, description, keywords, categories, url, file.contentType.get, labels = labels)
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



  /**
   * Content view page from an LMS
   */
  def viewLms(id: Long, courseId: Long) = Action(parse.tolerantText) {
    implicit request =>
      getContent(id) {
        content =>
          Courses.getCourse(courseId) {
            course =>
              val user = LMSAuth.ltiAuth(course)
              if (user.isDefined) {
                // Get the custom parameters
                val query = FormUrlEncodedParser.parse(request.body, request.charset.getOrElse("utf-8"))
                  .filterKeys(_.startsWith("custom")).map(d => (d._1.substring(7), d._2))
                Redirect(routes.ContentController.viewInCourse(id, courseId).toString(), query)
                  .withSession("userId" -> user.get.id.get.toString)
              } else
                Errors.forbidden
          }
      }
  }

  /**
   * Content stats page
   */
  def stats(id: Long) = Authentication.authenticatedAction() {
    implicit request =>
      implicit user =>
        getContent(id) {
          content =>

            // Only owners can view stats
            if (content isEditableBy user) {
              val resourceLibraryUrl = Play.configuration.getString("resourceLibrary.baseUrl").get
              Ok(views.html.content.stats(content, resourceLibraryUrl))
            } else
              Errors.forbidden
        }
  }

  /**
   * Content stats page within a course
   */
  def statsInCourse(id: Long, courseId: Long) = Authentication.authenticatedAction() {
    implicit request =>
      implicit user =>
        getContent(id) {
          content =>
            Courses.getCourse(courseId) {
              course =>

                // Only teachers can view stats
                if (user canEdit course) {
                  val resourceLibraryUrl = Play.configuration.getString("resourceLibrary.baseUrl").get
                  Ok(views.html.content.stats(content, resourceLibraryUrl, Some(course)))
                } else
                  Errors.forbidden
            }
        }
  }

  def downloadStats(id: Long) = Authentication.authenticatedAction() {
    implicit request =>
      implicit user =>
        getContent(id) {
          content =>

            // Only owners can view stats
            if (content isEditableBy user) {
              val activity = content.getActivity("")
              Async {
                ExcelWriter.writeActivity(activity).map { url =>
                  Redirect(url)
                }
              }
            } else
              Errors.forbidden
        }
  }

  def downloadStatsInCourse(id: Long, courseId: Long) = Authentication.authenticatedAction() {
    implicit request =>
      implicit user =>
        getContent(id) {
          content =>
            Courses.getCourse(courseId) {
              course =>

              // Only teachers can view stats
                if (user canEdit course) {
                  val coursePrefix = "course_" + course.id.get + ":"
                  val activity = content.getActivity(coursePrefix)
                  Async {
                    ExcelWriter.writeActivity(activity).map { url =>
                      Redirect(url)
                    }
                  }
                } else
                  Errors.forbidden
            }
        }
  }

  def clearStats(id: Long) = Authentication.authenticatedAction() {
    implicit request =>
      implicit user =>
        getContent(id) {
          content =>

          // Only owners can clear stats
            if (content isEditableBy user) {
              content.getActivity("").foreach(_.delete())
              Redirect(routes.ContentController.stats(content.id.get)).flashing("info" -> "Data cleared")
            } else
              Errors.forbidden
        }
  }

  def clearStatsInCourse(id: Long, courseId: Long) = Authentication.authenticatedAction() {
    implicit request =>
      implicit user =>
        getContent(id) {
          content =>
            Courses.getCourse(courseId) {
              course =>

              // Only teachers can clear stats
                if (user canEdit course) {
                  val coursePrefix = "course_" + course.id.get + ":"
                  content.getActivity(coursePrefix).foreach(_.delete())
                  Redirect(routes.ContentController.statsInCourse(content.id.get, course.id.get))
                    .flashing("info" -> "Data cleared")
                } else
                  Errors.forbidden
            }
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
              val categories = request.body.get("categories").map(_.toList).getOrElse(Nil)
              val labels = request.body("labels").toList

              // Update the name and labels of the content
              content.copy(name = title, labels = labels).save

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

  def setImageSettings(content: Content, course: Option[Course] = None, user: Option[User] = None)(implicit request: Request[Map[String, Seq[String]]]) {
    val prefix = course.map(c => "course_" + c.id.get + ":")
      .getOrElse(user.map(u => "user_" + u.id.get + ":").getOrElse(""))
    val enabledAnnotationDocuments = request.body.get("annotationDocs").map(_.mkString(",")).getOrElse("")
    content.setSetting(prefix + "enabledAnnotationDocuments", enabledAnnotationDocuments).save
  }

  def setTextSettings(content: Content, course: Option[Course] = None, user: Option[User] = None)(implicit request: Request[Map[String, Seq[String]]]) {
    val prefix = course.map(c => "course_" + c.id.get + ":")
      .getOrElse(user.map(u => "user_" + u.id.get + ":").getOrElse(""))
    val enabledAnnotationDocuments = request.body.get("annotationDocs").map(_.mkString(",")).getOrElse("")
    content.setSetting(prefix + "enabledAnnotationDocuments", enabledAnnotationDocuments).save
  }

  def setSettings(id: Long) = Authentication.authenticatedAction(parse.urlFormEncoded) {
    implicit request =>
      implicit user =>
        getContent(id) {
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
                  if (contentType == 'video || contentType == 'audio)
                    setAudioVideoSettings(content, Some(course))
                  if (contentType == 'image)
                    setImageSettings(content, Some(course))

                  Redirect(routes.ContentController.viewInCourse(id, course.id.get)).flashing("success" -> "Settings updated.")
                } else
                  Errors.forbidden
            }
        }
  }

  def setPersonalSettings(id: Long) = Authentication.authenticatedAction(parse.urlFormEncoded) {
    implicit request =>
      implicit user =>
        getContent(id) {
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
//            if (content isEditableBy user) {
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
                      val subjectId = (resource \ "id").as[String]

                      AdditionalDocumentAdder.add(content, subjectId, 'captionTrack) {
                        course =>
                          val route =
                            if (course.isDefined) routes.ContentController.viewInCourse(content.id.get, course.get.id.get)
                            else routes.ContentController.view(content.id.get)
                          Redirect(route).flashing("info" -> "Caption track added")
                      }
//                      val captionTracks = subjectId :: content.enabledCaptionTracks
//                      content.setSetting("enabledCaptionTracks", captionTracks.mkString(",")).save
//
//                      // Add the relation
//                      // Check to see if the user is allowed to add the captions directly, or it is personal content.
//                      val attributes: Map[String, String] =
//                        if (content isEditableBy user) Map()
//                        else {
//
//                          //Is this for a course or a user
//                          if (request.queryString.get("course").isDefined)
//                            Map("owner" -> "course", "ownerId" -> request.queryString("course")(0))
//                          else
//                            Map("owner" -> "user", "ownerId" -> user.id.get.toString)
//                        }
//                      ResourceController.addRelation("1", subjectId, content.resourceId, "transcriptOf", attributes).map(r => {
//                        Redirect(routes.ContentController.view(content.id.get)).flashing("info" -> "Transcript added")
//                      })
                    }
                  }
                }

              } else
                Errors.forbidden
//            } else
//              Errors.forbidden
        }
  }

  def addAnnotations(id: Long) = Authentication.authenticatedAction(parse.multipartFormData) {
    implicit request =>
      implicit user =>
        getContent(id) {
          content =>
//            if (content isEditableBy user) {

              val file = request.body.file("file").get
              val mime = "application/json"
              val title = request.body.dataParts("title")(0)

              Async {
                // Upload the file
                FileUploader.uploadFile(file.ref.file, FileUploader.uniqueFilename(file.filename), mime).flatMap { url =>

                  // Create subtitle (subject) resource
                  ResourceHelper.createResourceWithUri(title, "", "annotations", Nil, "text", url, mime).flatMap { resource =>
                    val subjectId = (resource \ "id").as[String]
                    AdditionalDocumentAdder.add(content, subjectId, 'annotations) {
                      course =>
                        val route =
                          if (course.isDefined) routes.ContentController.viewInCourse(content.id.get, course.get.id.get)
                          else routes.ContentController.view(content.id.get)
                        Redirect(route).flashing("info" -> "Annotations added")
                    }

//                    val annotationDocuments = subjectId :: content.enabledAnnotationDocuments
//                    content.setSetting("enabledAnnotationDocuments", annotationDocuments.mkString(",")).save
//
//                    // Add the relation
//                    // Check to see if the user is allowed to add the annotations directly, or it is personal content.
//                    val attributes: Map[String, String] =
//                      if (content isEditableBy user) Map("type" -> "annotations")
//                      else {
//
//                        //Is this for a course or a user
//                        if (request.queryString.get("course").isDefined)
//                          Map("type" -> "annotations", "owner" -> "course", "ownerId" -> request.queryString("course")(0))
//                        else
//                          Map("type" -> "annotations", "owner" -> "user", "ownerId" -> user.id.get.toString)
//                      }
//                    ResourceController.addRelation("1", subjectId, content.resourceId, "references", attributes).map(r => {
//                      Redirect(routes.ContentController.view(content.id.get)).flashing("info" -> "Annotations added")
//                    })
                  }
                }
              }
//            } else
//              Errors.forbidden
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

                // Make sure the user is allowed to edit the course
                if (user canEdit course) {
                  course.addContent(content)
                  Redirect(routes.ContentController.view(id)).flashing("info" -> "Content added to course")
                } else
                  Errors.forbidden
            }
        }
  }

  def editAnnotations(id: Long) = Authentication.authenticatedAction() {
    implicit request =>
      implicit user =>
        getContent(id) {
          content =>

//            if (content isEditableBy user) {
              val resourceLibraryUrl = Play.configuration.getString("resourceLibrary.baseUrl").get
              Ok(views.html.content.annotationEditor(content, resourceLibraryUrl))
//            } else
//              Errors.forbidden
        }
  }

  def saveAnnotations(id: Long) = Authentication.authenticatedAction(parse.urlFormEncoded) {
    implicit request =>
      implicit user =>
        getContent(id) {
          content =>

//            if (content isEditableBy user) {
              val title = request.body.get("title").map(_(0))
              val annotations = request.body("annotations")(0)
              val stream = new ByteArrayInputStream(annotations.getBytes("UTF-8"))
              val length = annotations.getBytes("UTF-8").size // Don't use string length. Breaks if there are 2-byte characters
              val mime = "application/json"
              val filename = request.body.get("filename").map(_(0)).getOrElse(FileUploader.uniqueFilename(annotations + ".json"))

              Async {
                // Upload the annotations
                // TODO: Somehow make sure that the user isn't overwriting somebody else's annotations
                FileUploader.uploadStream(stream, filename, length, mime).flatMap { url =>

                  // If there is a title defined then this is a new annotation document
                  if (title.isDefined) {
                    // Create subtitle (subject) resource
                    ResourceHelper.createResourceWithUri(title.get, "", "annotations", Nil, "text", url, mime).flatMap { resource =>
                      val subjectId = (resource \ "id").as[String]

                      AdditionalDocumentAdder.add(content, subjectId, 'annotations) {
                        course =>
                          val route =
                            if (course.isDefined) routes.ContentController.viewInCourse(content.id.get, course.get.id.get)
                            else routes.ContentController.view(content.id.get)
                          Redirect(route).flashing("info" -> "Annotations added")
                      }

//                      // Have this annotation document enabled if the owner is adding it or is being added to a course
//                      val prefix =
//                        if (course.isDefined)
//                          "course_" + course.get.id.get + ":"
//                        else {
//                          if (content isEditableBy user)
//                            ""
//                          else
//                            "user_" + user.id.get + ":"
//                        }
//                      val settingName = prefix + "enabledAnnotationDocuments"
//                      val enabledDocuments = subjectId :: content.settings.get(settingName)
//                        .map(_.split(",").filterNot(_.isEmpty).toList).getOrElse(Nil)
//
//                      // Save the settings
//                      content.setSetting(settingName, enabledDocuments.mkString(",")).save
//
//                      // Add the relation
//                      // Check to see if the user is allowed to add the annotations directly, or it is personal content.
//                      val attributes: Map[String, String] =
//                        if (content isEditableBy user) Map("type" -> "annotations")
//                        else {
//
//                          //Is this for a course or a user
//                          if (course.isDefined)
//                            Map("type" -> "annotations", "owner" -> "course", "ownerId" -> course.get.id.get.toString)
//                          else
//                            Map("type" -> "annotations", "owner" -> "user", "ownerId" -> user.id.get.toString)
//                        }
//                      ResourceController.addRelation("1", subjectId, content.resourceId, "references", attributes).map(r => {
//                        val route =
//                          if (course.isDefined)
//                            routes.ContentController.viewInCourse(content.id.get, course.get.id.get)
//                          else
//                            routes.ContentController.view(content.id.get)
//                        Redirect(route).flashing("info" -> "Annotations added")
//                      })
                    }
                  } else {

                    // We are just updating
                    Future {
                      Redirect(routes.ContentController.view(content.id.get)).flashing("info" -> "Annotations updated")
                    }
                  }
                }
              }
//            } else
//              Errors.forbidden
        }
  }

  def changeThumbnail(id: Long) = Authentication.authenticatedAction(parse.multipartFormData) {
    implicit request =>
      implicit user =>
        getContent(id) {
          content =>

            val file = request.body.file("file").get
            val url = request.body.dataParts("url")(0)

            Async {
              if (url.isEmpty) {

                val image = ImageIO.read(file.ref.file)
                val thumbnail = ImageTools.makeThumbnail(image)
                FileUploader.uploadImage(thumbnail, FileUploader.uniqueFilename("thumbnail.jpg")).map { thumbnailUrl =>
                  content.copy(thumbnail = thumbnailUrl).save
                  Redirect(routes.ContentController.view(content.id.get)).flashing("info" -> "Thumbnail changed")
                }
              } else {
                ImageTools.generateThumbnail(url).map { thumbnailUrl =>
                  content.copy(thumbnail = thumbnailUrl).save
                  Redirect(routes.ContentController.view(content.id.get)).flashing("info" -> "Thumbnail changed")
                }
              }
            }
        }
  }
}
