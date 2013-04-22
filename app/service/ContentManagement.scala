package service

import concurrent.{ExecutionContext, Future}
import models.{User, Content}
import anorm.NotAssigned
import java.io.File
import ExecutionContext.Implicits.global


case class ContentDescriptor(title: String, description: String, keywords: String, categories: List[String],
                             url: String, mime: String, thumbnail: Option[String] = None)

/**
 * This service helps with the creation and management of content objects and their corresponding resources.
 */
object ContentManagement {

  /**
   * Creates content depending on the content type
   * @param info A ContentDescriptor which contains information about the content
   * @param owner The user who is to own the content
   * @param contentType The type of content
   * @return The content object in a future
   */
  def createContent(info: ContentDescriptor, owner: User, contentType: Symbol): Future[Content] = {
    contentType match {
      case 'audio => createAudio(info, owner)
      case 'image => {
        // Create a thumbnail
        ImageTools.generateThumbnail(info.url).flatMap(thumbnail => {
          val imageInfo = info.copy(thumbnail = Some(thumbnail))
          createImage(imageInfo, owner)
        })
      }
      case 'video => {
        // Create a thumbnail
        VideoTools.generateThumbnail(info.url).flatMap(thumbnail => {
          val videoInfo = info.copy(thumbnail = Some(thumbnail))
          createVideo(videoInfo, owner)
        })
      }
      case 'text => {
        createText(info, owner)
      }
      case _ => Future { null }
    }
  }

  /**
   * Create a video content object with a corresponding resource object from information.
   * @param info A ContentDescriptor which contains information about the content
   * @param owner The user who is to own the video
   * @return The content object in a future
   */
  def createVideo(info: ContentDescriptor, owner: User): Future[Content] = {
    // Create the resource
    ResourceHelper.createResourceWithUri(info.title, info.description, info.keywords, info.categories, "video",
      info.url, info.mime).map(resource => {

      val resourceId = (resource \ "id").as[String]

      // Set a thumbnail in the resource
      if (info.thumbnail.isDefined)
        ResourceHelper.addThumbnail(resourceId, info.thumbnail.get)

      // Create the content and set the user and the owner
      val content = Content(NotAssigned, info.title, 'video, info.thumbnail.getOrElse(""), resourceId).save
      owner.addContent(content)
      content
    })
  }

  /**
   * Creates an audio content object with a corresponding resource object from information
   * @param info A ContentDescriptor which contains information about the content
   * @param owner The user who is to own the audio
   * @return The content object in a future
   */
  def createAudio(info: ContentDescriptor, owner: User): Future[Content] = {
    // Create the resource
    ResourceHelper.createResourceWithUri(info.title, info.description, info.keywords, info.categories, "audio",
      info.url, info.mime).map(resource => {

      val resourceId = (resource \ "id").as[String]

      // Create the content and set the user and the owner
      val content = Content(NotAssigned, info.title, 'audio, info.thumbnail.getOrElse(""), resourceId).save
      owner.addContent(content)
      content
    })
  }

  /**
   * Creates a text content object with a corresponding resource object from information
   * @param info A ContentDescriptor which contains information about the content
   * @param owner The user who is to own the audio
   * @return The content object in a future
   */
  def createText(info: ContentDescriptor, owner: User): Future[Content] = {
    // Create the resource
    ResourceHelper.createResourceWithUri(info.title, info.description, info.keywords, info.categories, "text",
      info.url, info.mime).map(resource => {

      val resourceId = (resource \ "id").as[String]

      // Create the content and set the user and the owner
      val content = Content(NotAssigned, info.title, 'text, info.thumbnail.getOrElse(""), resourceId).save
      owner.addContent(content)
      content
    })
  }

  /**
   * Creates an image content object with a corresponding resource object from information
   * @param info A ContentDescriptor which contains information about the content
   * @param owner The user who is to own the image
   * @return The content object in a future
   */
  def createImage(info: ContentDescriptor, owner: User): Future[Content] = {
    // Create the resource
    ResourceHelper.createResourceWithUri(info.title, info.description, info.keywords, info.categories, "image",
      info.url, info.mime).map(resource => {

      val resourceId = (resource \ "id").as[String]

      // Set a thumbnail in the resource
      if (info.thumbnail.isDefined)
        ResourceHelper.addThumbnail(resourceId, info.thumbnail.get)

      // Create the content and set the user and the owner
      val content = Content(NotAssigned, info.title, 'image, info.thumbnail.getOrElse(""), resourceId).save
      owner.addContent(content)
      content
    })
  }

}
