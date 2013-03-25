package service

import concurrent.{ExecutionContext, Future}
import models.{User, Content}
import anorm.NotAssigned
import java.io.File
import ExecutionContext.Implicits.global

/**
 * This service helps with the creation and management of content objects and their corresponding resources.
 */
object ContentManagement {

  def uploadFile(file: File): String = {
    "TODO"
  }

  /**
   * Creates content depending on the content type
   * @param name The name of the content
   * @param description A description about the content
   * @param url The URL to the content
   * @param thumbnail A thumbnail of the content
   * @param owner The user who is to own the content
   * @param contentType The type of content
   * @return The content object in a future
   */
  def createContent(name: String, description: String, url: String, thumbnail: String, owner: User,
                    contentType: Symbol): Future[Content] = {
    contentType match {
      case 'video => createVideo(name, description, url, thumbnail, owner)
      case 'audio => createAudio(name, description, url, owner)
      case 'image => createImage(name, description, url, owner)
      case _ => Future { null }
    }
  }

  /**
   * Create a video content object with a corresponding resource object from information.
   * @param name The name of the video
   * @param description A description about the video
   * @param url The url of the video
   * @param thumbnail The url of a thumbnail image to the video
   * @param owner The user who is to own the video
   * @return The content object in a future
   */
  def createVideo(name: String, description: String, url: String, thumbnail: String, owner: User): Future[Content] = {
    // Create the resource
    ResourceHelper.createResourceWithUri(name, url, description, "video").map(resourceId => {

      // Set a thumbnail in the resource
      if (!thumbnail.isEmpty)
        ResourceHelper.addThumbnail(resourceId, thumbnail)

      // Create the content and set the user and the owner
      val content = Content(NotAssigned, name, 'video, thumbnail, resourceId).save
      owner.addContent(content)
      content
    })
  }

  /**
   * Creates an audio content object with a corresponding resource object from information
   * @param name The name of the audio
   * @param description A description about the audio
   * @param url The url of the audio
   * @param owner The user who is to own the audio
   * @return The content object in a future
   */
  def createAudio(name: String, description: String, url: String, owner: User): Future[Content] = {
    // Create the resource
    ResourceHelper.createResourceWithUri(name, url, description, "audio").map(resourceId => {

      // Create the content and set the user and the owner
      val content = Content(NotAssigned, name, 'audio, "", resourceId).save
      owner.addContent(content)
      content
    })
  }

  /**
   * Creates an image content object with a corresponding resource object from information
   * @param name The name of the image
   * @param description A description about the image
   * @param url The url to the image
   * @param owner The user who is to own the image
   * @return The content object in a future
   */
  def createImage(name: String, description: String, url: String, owner: User): Future[Content] = {
    // Create the resource
    ResourceHelper.createResourceWithUri(name, url, description, "image").map(resourceId => {

      // Create the content and set the user and the owner
      val content = Content(NotAssigned, name, 'image, url, resourceId).save
      owner.addContent(content)
      content
    })
  }

}
