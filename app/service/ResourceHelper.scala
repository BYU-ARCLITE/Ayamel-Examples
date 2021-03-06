package service

import play.api.{Logger, Play}
import play.api.libs.json._
import play.api.libs.ws.WS
import play.api.libs.MimeTypes
import play.api.Play.current
import concurrent.{ExecutionContext, Future}
import ExecutionContext.Implicits.global
import dataAccess.ResourceController
import models.User

/**
 * This builds upon the Resource API wrapper in ResourceController by providing functions which do some level of data
 * manipulation.
 */
object ResourceHelper {

  val resourceLibraryBaseUrl = Play.configuration.getString("resourceLibrary.baseUrl").get.stripSuffix("/api/v1/")
  /**
   * Determines if the given URL is a standard HTTP or HTTPS url or not
   * @param uri The URL to check
   * @return
   */
  def isHTTP(uri: String): Boolean =
    uri.startsWith("http://") || uri.startsWith("https://") &&
    !isYouTube(uri) && !isVimeo(uri)

  /**
   * Determines if the given URL is an RTMP url or not
   * @param uri The URL to check
   * @return
   */
  def isRTMP(uri: String): Boolean =
    uri.startsWith("rtmp://") || uri.startsWith("rtmpe://")

  /**
   * Determines if the given URL is a SCOLA url or not
   * @param uri The URL to check
   * @return
   */
  def isSCOLA(uri: String): Boolean = uri.startsWith("scola://")

  /**
   * Determines if the given URL is a SCOLA url or not
   * @param uri The URL to check
   * @return
   */
  def isBYUSecure(uri: String): Boolean = uri.startsWith("byu://")

  /**
   * Determines if the given URL is to a YouTube video or not
   * @param uri The URL to check
   * @return
   */
  def isYouTube(uri: String): Boolean = uri.startsWith("youtube://") ||
    uri.startsWith("http://www.youtube.com/watch?v=") ||
    uri.startsWith("https://www.youtube.com/watch?v=") ||
    uri.startsWith("http://youtu.be/") ||
    uri.startsWith("https://youtu.be/")

  /**
   * Determines if the given URL is to a Vimeo video or not
   * @param uri The URL to check
   * @return
   */
  def isVimeo(uri: String): Boolean = uri.startsWith("vimeo://") ||
    uri.startsWith("http://www.vimeo.com/") || uri.startsWith("https://www.vimeo.com/")

  /**
   * Determines if the given URL is to an Ooyala video or not
   * @param uri The URL to check
   * @return
   */
  def isOoyala(uri: String): Boolean = uri.startsWith("ooyala://") ||
    uri.startsWith("http://player.ooyala.com/iframe.js#") ||
    uri.startsWith("https://player.ooyala.com/iframe.js#")

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
  def isValidUrl(uri: String): Boolean =
    isHTTP(uri) || isRTMP(uri) || isSCOLA(uri) || isBYUSecure(uri) ||
    isYouTube(uri) || isBrightcove(uri) || isVimeo(uri) || isOoyala(uri)

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
    if (isYouTube(uri)) {
      "video/x-youtube"
    } else if (isBrightcove(uri)) {
      "video/x-brightcove"
    } else if (isVimeo(uri)) {
      "video/x-vimeo"
    } else if (isOoyala(uri)) {
      "video/x-ooyala"
    } else if (isRTMP(uri)) {
      MimeTypes.forFileName(uri).getOrElse("video/mp4")
    } else {
      MimeTypes.forFileName(uri).getOrElse("application/octet-stream")
    }
  }

  /**
   * Creates a new resource and sets a download/stream uri
   * @param uri The download uri of the resource
   * @param mime The mime type of the file at the uri
   * @return The id of the resource in a future
   */
  def createResourceWithUri(resource: JsObject, user: User,
    uri: String, bytes: Long, mime: String, fileAttributes: Map[String, String] = Map()): Future[JsValue] = {

    // Create the resource
    ResourceController.createResource(resource, user).flatMap { json =>
      val message = (json \ "response" \ "message").asOpt[String]

      val id = (json \ "resource" \ "id").asOpt[String]
      if (!id.isDefined) {
        throw new Exception(message.getOrElse("Could not create resource."))
      }

      val uploadUrl = (json \ "contentUploadUrl").asOpt[String]
      if (!uploadUrl.isDefined) {
        ResourceController.deleteResource(id.get)
        throw new Exception(message.getOrElse("Could not create resource."))
      }

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
      ResourceController.setRemoteFiles(resourceLibraryBaseUrl + uploadUrl.get, remoteFiles).map { json =>
        (json \ "resource") match {
        case JsDefined(res) => res
        case _ =>
          Logger.debug(s"Response from setRemoteFiles: ${json.toString()}")
          ResourceController.deleteResource(id.get)
          val message = (json \ "response" \ "message").asOpt[String]
          throw new Exception(message.getOrElse("Could not set resource files."))
        }
      }
    }
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
    ResourceController.getResource(id).flatMap { json =>
      val resource = json \ "resource"

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
      ResourceController.requestUploadUrl(id).flatMap { json =>
        val uploadUrl = (json \ "contentUploadUrl").as[String]
        // Set the new files
        val obj = Json.obj("remoteFiles" -> newFiles)
        ResourceController.setRemoteFiles(uploadUrl, obj)
      }
    }.map { json =>
      (json \ "resource") match {
      case JsDefined(res) => res
      case _ =>
        Logger.debug(s"Response from setRemoteFiles: ${json.toString()}")
        val message = (json \ "response" \ "message").asOpt[String]
        throw new Exception(message.getOrElse("Could not set resource files."))
      }
    }
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
      val newFiles = files.as[JsArray].value.map { file =>
        if ((file \ "representation").as[String] == "original")
          file.as[JsObject] ++ nuller ++ Json.obj(
            getUrlName(uri) -> uri,
            "mime" -> getMimeFromUri(uri),
            "mimeType" -> getMimeFromUri(uri)
          )
        else
          file
      }

      // Save the updated files
      ResourceController.requestUploadUrl(id).flatMap { json =>
        val uploadUrl = (json \ "contentUploadUrl").as[String]

        // Set the new files
        val obj = Json.obj("remoteFiles" -> newFiles)
        ResourceController.setRemoteFiles(uploadUrl, obj)
      }
    }.map { json => (json \ "resource").get }
  }

  def setClientUser(id: String, data: Map[String, String]): Future[JsValue] = {
    val json = Json.obj(
      "clientUser" -> Json.toJson(data)
    )
    ResourceController.updateResource(id, json)
  }
}
