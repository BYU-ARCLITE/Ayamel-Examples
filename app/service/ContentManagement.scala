package service

import concurrent.{ExecutionContext, Future}
import controllers.authentication.Authentication
import controllers._
import models.{User, Content, Course}
import anorm.NotAssigned
import javax.imageio.ImageIO
import java.io.File
import java.net.URL
import ExecutionContext.Implicits.global
import play.api.libs.json.{JsValue, Json}
import play.api.mvc.Results._
import play.api.mvc.{Action, Result, Request, Controller, SimpleResult, ResponseHeader}

case class ContentDescriptor(title: String, description: String, keywords: String, url: String, bytes: Long,
                             mime: String, thumbnail: Option[String] = None, labels: List[String] = Nil,
                             languages: List[String])

/**
 * This service helps with the creation and management of content objects and their corresponding resources.
 */
object ContentManagement {

  /**
   *  This function is used to get the course
   *  without an implicit request
   */
  private def getCourse(id: Long)(f: Course => Result): Result = {
    Course.findById(id).map( course => f(course) ).getOrElse(Errors.notFound)
  }

  /**
   * Add newly created content to course
   * @param courseId
   * @param content Content object
   */
  private def addToCourse(courseId: Long, content: Content): Unit = {
      getCourse(courseId) { course =>
        course.addContent(content)
        // how to check if content was correctly added to the course?
        Ok("")
      }
  }

  /**
   * Creates content depending on the content type and adds it to the specified course
   * @param info A ContentDescriptor which contains information about the content
   * @param owner The user who is to own the content
   * @param contentType The type of content
   * @param courseId Id of target course
   * @return The content object in a future
   */
  def createAndAddToCourse(info: ContentDescriptor, owner: User, contentType: Symbol, courseId: Long): Future[Result] = {

    val redirect = Redirect(routes.Courses.view(courseId))

    contentType match {
      case 'audio => {
        createAudio(info, owner).map { opt =>
          opt.map { content =>
            addToCourse(courseId, content)
            redirect.flashing("success" -> "Content created and added to course")
          }.getOrElse {
            redirect.flashing("error" -> "Could not add content to course.")
          }
        }
      }
      case 'image => {
        // Create a thumbnail
        ImageTools.generateThumbnail(info.url).flatMap { thumbnail =>
          val imageInfo = info.copy(thumbnail = thumbnail)
          createImage(imageInfo, owner).map { opt =>
            opt.map { content =>
              addToCourse(courseId, content)
              redirect.flashing("success" -> "Content created and added to course")
            }.getOrElse {
              redirect.flashing("error" -> "Could not add content to course.")
            }
          }
        }
      }
      case 'video => {
        // Create a thumbnail
        VideoTools.generateThumbnail(info.url).flatMap { thumbnail =>
          val videoInfo = info.copy(thumbnail = thumbnail)
          createVideo(videoInfo, owner).map { opt =>
            opt.map { content =>
              addToCourse(courseId, content)
              redirect.flashing("success" -> "Content created and added to course")
            }.getOrElse {
              redirect.flashing("error" -> "Could not add content to course.")
            }
          }
        }
      }
      case 'text => {
        createText(info, owner).map { opt =>
          opt.map { content =>
            addToCourse(courseId, content)
            redirect.flashing("success" -> "Content created and added to course")
          }.getOrElse {
            redirect.flashing("error" -> "Could not add content to course")
          }
        }
      }
      case _ => Future { redirect.flashing("error" -> "Error creating content") }
    }
  }

  /**
   * Creates content depending on the content type
   * @param info A ContentDescriptor which contains information about the content
   * @param owner The user who is to own the content
   * @param contentType The type of content
   * @return The content object in a future
   */
  def createContent(info: ContentDescriptor, owner: User, contentType: Symbol): Future[Option[Content]] = {
    contentType match {
      case 'audio => createAudio(info, owner)
      case 'image => {
        // Create a thumbnail
        ImageTools.generateThumbnail(info.url).flatMap { thumbnail =>
          val imageInfo = info.copy(thumbnail = thumbnail)
          createImage(imageInfo, owner)
        }
      }
      case 'video => {
        // Create a thumbnail
        VideoTools.generateThumbnail(info.url).flatMap { thumbnail =>
          val videoInfo = info.copy(thumbnail = thumbnail)
          createVideo(videoInfo, owner)
        }
      }
      case 'text => {
        createText(info, owner)
      }
      case _ => Future { null }
    }
  }

  def createResource(info: ContentDescriptor, resourceType: String): Future[Option[JsValue]] = {
    val resource = ResourceHelper.make.resource(Json.obj(
      "title" -> info.title,
      "description" -> info.description,
      "keywords" -> info.keywords,
      "type" -> resourceType,
      "languages" -> Json.obj(
        "iso639_3" -> info.languages
      )
    ))
    ResourceHelper.createResourceWithUri(resource, info.url, info.bytes, info.mime)
  }

  /**
   * Create a video content object with a corresponding resource object from information.
   * @param info A ContentDescriptor which contains information about the content
   * @param owner The user who is to own the video
   * @return The content object in a future
   */
  def createVideo(info: ContentDescriptor, owner: User): Future[Option[Content]] = {
    // Create the resource
    createResource(info, "video").map { resource =>
      resource.map { json =>
        val resourceId = (json \ "id").as[String]

        // Set a thumbnail in the resource
        if (info.thumbnail.isDefined && !info.thumbnail.get.isEmpty)
          ResourceHelper.addThumbnail(resourceId, info.thumbnail.get)

        // Create the content and set the user and the owner
        val content = Content(NotAssigned, info.title, 'video, info.thumbnail.getOrElse(""), resourceId, labels = info.labels).save
        owner.addContent(content)
        content
      }
    }
  }

  /**
   * Creates an audio content object with a corresponding resource object from information
   * @param info A ContentDescriptor which contains information about the content
   * @param owner The user who is to own the audio
   * @return The content object in a future
   */
  def createAudio(info: ContentDescriptor, owner: User): Future[Option[Content]] = {
    // Create the resource
    createResource(info, "audio").map { resource =>
      resource.map { json =>
        val resourceId = (json \ "id").as[String]

        // Create the content and set the user and the owner
        val content = Content(NotAssigned, info.title, 'audio, info.thumbnail.getOrElse(""), resourceId, labels = info.labels).save
        owner.addContent(content)
        content
      }
    }
  }

  /**
   * Creates a text content object with a corresponding resource object from information
   * @param info A ContentDescriptor which contains information about the content
   * @param owner The user who is to own the audio
   * @return The content object in a future
   */
  def createText(info: ContentDescriptor, owner: User): Future[Option[Content]] = {
    // Create the resource
    createResource(info, "document").map { resource =>
      resource.map { json =>
        val resourceId = (json \ "id").as[String]

        // Create the content and set the user and the owner
        val content = Content(NotAssigned, info.title, 'text, info.thumbnail.getOrElse(""), resourceId, labels = info.labels).save
        owner.addContent(content)
        content
      }
    }
  }

  /**
   * Creates an image content object with a corresponding resource object from information
   * @param info A ContentDescriptor which contains information about the content
   * @param owner The user who is to own the image
   * @return The content object in a future
   */
  def createImage(info: ContentDescriptor, owner: User): Future[Option[Content]] = {
    // Create the resource
    createResource(info, "image").map { resource =>
      resource.map { json =>
        val resourceId = (json \ "id").as[String]

        // Set a thumbnail in the resource
        info.thumbnail.foreach( thumbnail =>
          ResourceHelper.addThumbnail(resourceId, thumbnail)
        )

        // Create the content and set the user and the owner
        val content = Content(NotAssigned, info.title, 'image, info.thumbnail.getOrElse(""), resourceId, labels = info.labels).save
        owner.addContent(content)
        content
      }
    }
  }

}
