package service

import play.api.libs.json.{JsObject, JsValue, JsArray, Json}
import concurrent.{ExecutionContext, Future}
import play.api.libs.MimeTypes
import ExecutionContext.Implicits.global
import dataAccess.ResourceController

/**
 * This builds upon the Resource API wrapper in ResourceController by providing functions which do some level of data
 * manipulation.
 */
object ResourceHelper {

  /**
   * Determines if the given URL is to a YouTube video or not
   * @param uri The URL to check
   * @return
   */
  def isYouTube(uri: String): Boolean = uri.startsWith("youtube://") ||
    uri.startsWith("http://www.youtube.com/watch?v=") || uri.startsWith("http://youtu.be/")

  /**
   * Determines if the given URL is to a brightcove video or not
   * @param uri The URL to check
   * @return
   */
  def isBrightcove(uri: String): Boolean = uri.startsWith("brightcove://")

  /**
   * Methods for creating resources with basic data
   */
  object make {
    def resource(resource: JsObject = Json.obj()): JsObject = Json.obj(
      "title" -> "",
      "description" -> "",
      "keywords" -> "",
      "categories" -> List[String](),
      "languages" -> List("eng"),
      "type" -> "data"
    ) ++ resource

    def relation(relation: JsObject = Json.obj()): JsObject = Json.obj(
      "subjectId" -> "",
      "objectId" -> "",
      "type" -> "",
      "attributes" -> Map[String, String]()
    ) ++ relation

    def file(file: JsObject = Json.obj()): JsObject = Json.obj(
      "mime" -> "application/octet-stream",
      "representation" -> "original",
      "quality" -> "1",
      "attributes" -> Map[String, String]()
    ) ++ file
  }

  /**
   * Returns the name of the URL attributes. Either downloadUri or streamUri
   * @param url The url to check
   * @return
   */
  def getUrlName(url: String): String =
    if (isYouTube(url) || isBrightcove(url))
      "streamUri"
    else
      "downloadUri"

  /**
   * Attempts to retrieve the mime type from the uri. Doesn't deal with the resource library, but this is used by other
   * functions in this object.
   * @param uri The uri the mime type will be for
   * @return The mime type
   */
  def getMimeFromUri(uri: String): String = {
    // Check for YouTube
    if (isYouTube(uri)) {
      "video/youtube"
    } else if (isBrightcove(uri)) {
      "video/brightcove"
    } else {
      val extension = uri.substring(uri.lastIndexOf("."))
      val mime1 = MimeTypes.forExtension(extension)
      val mime2 = MimeTypes.forFileName(uri)
      if (mime1.isDefined)
        mime1.get
      else
      if (mime2.isDefined)
        mime2.get
      else
        "application/octet-stream"
    }
  }

  /**
   * Creates a new resource and sets a download/stream uri
   * @param uri The download uri of the resource
   * @param mime The mime type of the file at the uri
   * @return The id of the resource in a future
   */
  def createResourceWithUri(resource: JsObject, uri: String, mime: String, fileAttributes: Map[String, String] = Map()): Future[JsValue] = {

    // Create the resource
    ResourceController.createResource(resource).flatMap(json => {
      val contentUploadUrl = (json \ "content_upload_url").as[String]

      // Add information about the file
      val file = make.file(Json.obj(
        getUrlName(uri) -> uri,
        "mime" -> mime,
        "attributes" -> fileAttributes
      ))
      val remoteFiles = Json.obj("remoteFiles" -> Json.arr(file))

      // Save this info and return the updated resource
      ResourceController.setRemoteFiles(contentUploadUrl, remoteFiles).map(_ \ "resource")
    })
  }

  /**
   * Adds a remote file to a resource by getting an upload url and appending the file to the existing list of files.
   * @param id The id of the resource
   * @param uri The url of the new file
   * @param mime The mime type of the new file
   * @param representation How the file represents the resource
   */
  def addRemoteFile(id: String, uri: String, mime: Option[String] = None, representation: String = "original"): Future[JsValue] = {
    // Get the resource
    ResourceController.getResource(id).flatMap(resourceResponse => {
      val resource = resourceResponse \ "resource"

      // Set the new file information
      val mimeType = mime.getOrElse(getMimeFromUri(uri))
      val file = make.file(Json.obj(
        "downloadUri" -> uri,
        "mime" -> mimeType,
        "representation" -> representation
      ))
      val files = (resource \ "content" \ "files").as[JsArray].value.toList
      val newFiles = JsArray(files ::: List(file))

      // Get an upload url
      ResourceController.requestUploadUrl(id).flatMap(uploadUrlResponse => {
        val uploadUrl = (uploadUrlResponse \ "content_upload_url").as[String]

        // Set the new files
        val obj = Json.obj("remoteFiles" -> newFiles)
        ResourceController.setRemoteFiles(uploadUrl, obj).map(_ \ "resource")
      })
    })
  }

  /**
   * Adds a thumbnail to the resource
   * @param id The id of the resource
   * @param thumbnailUri The url of the thumbnail
   * @param mime The mime type of the thumbnail
   */
  def addThumbnail(id: String, thumbnailUri: String, mime: Option[String] = None): Future[JsValue] =
    addRemoteFile(id, thumbnailUri, mime, "summary")

  def updateDownloadUri(id: String, uri: String): Future[JsValue] = {
    ResourceController.getResource(id).flatMap { json =>
      // Update the files
      val files = json \ "resource" \ "content" \ "files"
      val newFiles = files.as[JsArray].value.map(file => {
        if ((file \ "representation").as[String] == "original")
          file.as[JsObject] ++ Json.obj("downloadUri" -> uri)
        else
          file
      })

      // Save the updated files
      ResourceController.requestUploadUrl(id).flatMap { uploadUrlResponse =>
        val uploadUrl = (uploadUrlResponse \ "content_upload_url").as[String]

        // Set the new files
        val obj = Json.obj("remoteFiles" -> newFiles)
        ResourceController.setRemoteFiles(uploadUrl, obj).map(_ \ "resource")
      }
    }
  }

  def setAttributes(id: String, attributes: Map[String, String]): Future[JsValue] = {
    ResourceController.getResource(id).flatMap { json =>
      val resource = json \ "resource"
      val newAttributes = Json.toJson(attributes).as[JsObject]
      val attrs = Json.obj(
        "attributes" -> ((resource \ "attributes").asOpt[JsObject].getOrElse(Json.obj()) ++ newAttributes)
      )
      val updatedResource = resource.as[JsObject] ++ attrs
      ResourceController.updateResource(id, updatedResource)
    }
  }
}
