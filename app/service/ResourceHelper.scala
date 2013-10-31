package service

import play.api.Logger
import play.api.libs.json._
import concurrent.{ExecutionContext, Future}
import play.api.libs.MimeTypes
import ExecutionContext.Implicits.global
import dataAccess.ResourceController
import play.api.libs.ws.WS
import play.api.libs.json.JsArray
import play.api.libs.json.JsObject

/**
 * This builds upon the Resource API wrapper in ResourceController by providing functions which do some level of data
 * manipulation.
 */
object ResourceHelper {

  /**
   * Determines if the given URL is a standard HTTP or HTTPS url or not
   * @param uri The URL to check
   * @return
   */
  def isHTTP(uri: String): Boolean = uri.startsWith("http://") || uri.startsWith("https://")

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
   * Determines if the given URL is valid or not
   * @param uri The URL to check
   * @return
   */
  def isValidUrl(uri: String): Boolean = isHTTP(uri) || isYouTube(uri) || isBrightcove(uri)

  /**
   * Methods for creating resources with basic data
   */
  object make {
    def resource(resource: JsObject = Json.obj()): JsObject = Json.obj(
      "title" -> "",
      "description" -> "",
      "keywords" -> "",
      "languages" -> Json.obj(
        "iso639_3" -> List("eng")
      ),
      "type" -> "data"
    ) ++ resource

    def relation(relation: JsObject = Json.obj()): JsObject = Json.obj(
      "subjectId" -> "",
      "objectId" -> "",
      "type" -> "",
      "attributes" -> Map[String, String]()
    ) ++ relation

    def file(file: JsObject = Json.obj()): JsObject = Json.obj(
      "mimeType" -> "application/octet-stream",
      "representation" -> "original",
      "quality" -> 1,
      "bytes" -> 0,
      "attributes" -> Map[String, String]()
    ) ++ file
  }

  /**
   * Returns the name of the URL attributes. Either downloadUri or streamUri
   * @param url The url to check
   * @return
   */
  def getUrlName(url: String): String =
    if (isHTTP(url)) "downloadUri" else "streamUri"

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
  def createResourceWithUri(resource: JsObject, uri: String, bytes: Long, mime: String, fileAttributes: Map[String, String] = Map()): Future[JsValue] = {

    // Create the resource
    ResourceController.createResource(resource).flatMap(json => {
      val contentUploadUrl = (json \ "contentUploadUrl").as[String]

      // Add information about the file
      val file = make.file(Json.obj(
        getUrlName(uri) -> uri,
        "mimeType" -> mime,
        "bytes" -> bytes,
        "attributes" -> fileAttributes
      ))
      val remoteFiles = Json.obj("remoteFiles" -> Json.arr(file))
      Logger.debug("Resource Helper: create with URI")
      Logger.debug(remoteFiles.toString())

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
  def addRemoteFile(id: String, uri: String, bytes: Long, mime: Option[String] = None, representation: String = "original"): Future[JsValue] = {
    // Get the resource
    ResourceController.getResource(id).flatMap(resourceResponse => {
      val resource = resourceResponse \ "resource"

      // Set the new file information
      val mimeType = mime.getOrElse(getMimeFromUri(uri))
      val file = make.file(Json.obj(
        "downloadUri" -> uri,
        "mimeType" -> mimeType,
        "bytes" -> bytes,
        "representation" -> representation
      ))
      val files = (resource \ "content" \ "files").as[JsArray].value.toList
      val newFiles = JsArray(files ::: List(file))

      // Get an upload url
      ResourceController.requestUploadUrl(id).flatMap(uploadUrlResponse => {
        val uploadUrl = (uploadUrlResponse \ "contentUploadUrl").as[String]

        // Set the new files
        val obj = Json.obj("remoteFiles" -> newFiles)
        ResourceController.setRemoteFiles(uploadUrl, obj).map(_ \ "resource")
      })
    })
  }

  /**
   * Attempts to get the size of a URL-designated resource via HEAD
   * @param url The URL to get the size of
   * @return The future size (in bytes)
   */
  def getUrlSize(url: String): Future[Long] = {
    if (isHTTP(url))
      WS.url(url).head().map(_.header("Content-Length").getOrElse("0").toLong)
    else
      Future(0)
  }

  /**
   * Adds a thumbnail to the resource
   * @param id The id of the resource
   * @param thumbnailUri The url of the thumbnail
   * @param mime The mime type of the thumbnail
   */
  def addThumbnail(id: String, thumbnailUri: String, mime: Option[String] = None): Future[JsValue] =
    getUrlSize(thumbnailUri).flatMap(bytes =>
      addRemoteFile(id, thumbnailUri, bytes, mime, "summary")
    )

  val nuller = Json.obj(
    "streamUri" -> JsNull,
    "downloadUri" -> JsNull
  )

  def updateFileUri(id: String, uri: String): Future[JsValue] = {
    ResourceController.getResource(id).flatMap { json =>
      // Update the files
      val files = json \ "resource" \ "content" \ "files"
      val newFiles = files.as[JsArray].value.map(file => {
        if ((file \ "representation").as[String] == "original")
          file.as[JsObject] ++ nuller ++ Json.obj(
            getUrlName(uri) -> uri,
            "mime" -> getMimeFromUri(uri),
            "mimeType" -> getMimeFromUri(uri)
          )
        else
          file
      })

      // Save the updated files
      ResourceController.requestUploadUrl(id).flatMap { uploadUrlResponse =>
        val uploadUrl = (uploadUrlResponse \ "contentUploadUrl").as[String]

        // Set the new files
        val obj = Json.obj("remoteFiles" -> newFiles)
        ResourceController.setRemoteFiles(uploadUrl, obj).map(_ \ "resource")
      }
    }
  }

//  def setAttributes(id: String, attributes: Map[String, String]): Future[JsValue] = {
//    ResourceController.getResource(id).flatMap { json =>
//      val resource = json \ "resource"
//      val newAttributes = Json.toJson(attributes).as[JsObject]
//      val attrs = Json.obj(
//        "attributes" -> ((resource \ "attributes").asOpt[JsObject].getOrElse(Json.obj()) ++ newAttributes)
//      )
//      val updatedResource = resource.as[JsObject] ++ attrs
//      ResourceController.updateResource(id, updatedResource)
//    }
//  }

  def setClientUser(id: String, data: Map[String, String]): Future[JsValue] = {
    val json = Json.obj(
      "clientUser" -> Json.toJson(data)
    )
    ResourceController.updateResource(id, json)
//    ResourceController.getResource(id).flatMap { json =>
//      val resource = json \ "resource"
//      val newData = Json.toJson(data).as[JsObject]
//      val clientUser = Json.obj(
//        "clientUser" -> ((resource \ "clientUser").asOpt[JsObject].getOrElse(Json.obj()) ++ newData)
//      )
//      val updatedResource = resource.as[JsObject] ++ clientUser
//      ResourceController.updateResource(id, updatedResource)
//    }
  }
}
