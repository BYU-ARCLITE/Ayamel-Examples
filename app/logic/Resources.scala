package logic

import models.{CaptionTrack, Movie}
import play.api.libs.json.{JsArray, Json}
import concurrent.Await
import concurrent.duration._
import anorm.NotAssigned
import edu.byu.arclite.resourceLibrary.ResourceController
import play.api.libs.MimeTypes
import play.api.Logger

/**
 * Created with IntelliJ IDEA.
 * User: camman3d
 * Date: 2/20/13
 * Time: 2:41 PM
 * To change this template use File | Settings | File Templates.
 */
object Resources {

  def createResourceWithUri(title: String, uri: String, description: String = "", resourceType: String = "", mime: Option[String] = None): String = {
    // Create the resource
    val json = Await.result(ResourceController.createResource(title, description, "video"), 30 seconds)

    // Get information from the result
    val contentUploadUrl = (json \ "content_upload_url").as[String]
    val id = (json \ "resource" \ "id").as[String]

    // Attempt to obtain the mime type
    val mimeType = mime.getOrElse(MimeTypes.forFileName(uri).getOrElse("application/octet-stream"))

    // Add information about the file
    val fileInfo = Json.obj("remoteFiles" -> Json.arr(
      Json.obj(
        "downloadUri" -> uri,
        "mime" -> mimeType,
        "representation" -> "original",
        "quality" -> "1"
      )
    ))
    ResourceController.uploadRemoteFiles(contentUploadUrl, fileInfo)

    // Return the id
    id
  }

  def createMovieResource(title: String, description: String, uri: String): String = {
    val extension = uri.substring(uri.lastIndexOf("."))
    val mime = MimeTypes.forExtension(extension)
    createResourceWithUri(title, uri, description, "video", mime)
  }

  def addThumbnail(id: String, thumbnailUri: String, mime: Option[String] = None) {
    // Get the resource
    val resource = Await.result(ResourceController.getResource(id), 30 seconds) \ "resource"

    // Add the thumbnail to the file array
    val uploadUrl = (Await.result(ResourceController.requestUploadUrl(id), 30 seconds) \ "content_upload_url").as[String]
    val mimeType = mime.getOrElse(MimeTypes.forFileName(thumbnailUri).getOrElse("application/octet-stream"))
    val fileInfo = Json.obj("remoteFiles" -> JsArray((resource \ "content" \ "files").as[JsArray].value.toList ::: List(Json.obj(
      "downloadUri" -> thumbnailUri,
      "mime" -> mimeType,
      "representation" -> "summary",
      "quality" -> "1"
    ))))
    val x = ResourceController.uploadRemoteFiles(uploadUrl, fileInfo)
    val y = 1
  }

  def createCaptionTrackResource(captionTrack: CaptionTrack): String = {
    val url = "http://ayamel.byu.edu" + controllers.routes.CaptionTracks.view(captionTrack.id.get)
    createResourceWithUri(captionTrack.name, url, resourceType = "document", mime = Some("text/vtt"))
  }
}
