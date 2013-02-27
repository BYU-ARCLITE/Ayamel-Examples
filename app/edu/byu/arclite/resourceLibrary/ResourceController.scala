package edu.byu.arclite.resourceLibrary

import play.api.Play
import Play.current
import play.api.libs.json.{Json, JsValue}
import play.api.libs.ws.WS
import concurrent.Future
import concurrent.ExecutionContext.Implicits.global

/**
 * Wrappers for the resource library
 * http://ayamel.americancouncils.org/
 * @author Joshua Monson
 */
object ResourceController {

  // The base endpoint of the resource library api
  val baseUrl = Play.configuration.getString("resourceLibrary.baseUrl").get

  /**
   * List resources
   * The API endpoint is: GET resources
   * @param limit The number to list. Default is 50
   * @param offset Offset of results. Default is 0
   * @param descending Ascending/descending order switch
   * @return The future JSON result
   */
  def list(limit: Int = 50, offset: Int = 0, descending: Boolean = true): Future[JsValue] = {
    val order = if (descending) -1 else 1
    WS.url(baseUrl + "?limit=" + limit + "&order=" + order + "&skip=" + offset).get().map(_.json)
  }

  /**
   * Resource creation
   * The API endpoint is: POST resources
   * @param title The title of the new resource
   * @param description A written description of the new resource
   * @param resourceType The resource type of the new resource. View the API documentation for valid values.
   * @return The future JSON result
   */
  def createResource(title: String, description: String = "", resourceType: String): Future[JsValue] = {
    val json = Json.obj(
      "title" -> title,
      "description" -> description,
      "type" -> resourceType
    )
    WS.url(baseUrl).post(json).map(_.json)
  }

  /**
   * Derive as much of a full resource object as possible from a given uri. Note that custom resource providers can be
   * specified in URI format, for example YouTube: youtube://txqiwrbYGrs.
   * The API endpoint is: GET resources/scan
   * @param uri The uri to scan
   * @return The future JSON results
   */
  def scan(uri: String): Future[JsValue] = WS.url(baseUrl + "/scan?uri=" + uri).get().map(_.json)

  /**
   * Resource retrieval
   * The API endpoint is: GET resources/[id]
   * @param id The ID of the resource to get
   * @return The future JSON result
   */
  def getResource(id: String): Future[JsValue] = WS.url(baseUrl + "/" + id).get().map(_.json)

  /**
   * Updates the resource
   * The API endpoint is: PUT resources/[id]
   * @param id The ID of the resource to update
   * @param resource The JSON object describing the resource
   * @return The future JSON result
   */
  def updateResource(id: String, resource: JsValue): Future[JsValue] =
    WS.url(baseUrl + "/" + id).put(resource).map(_.json)

  /**
   * Deletes a resource
   * The API endpoint is: DELETE resources/[id]
   * @param id The ID of the resouce to delete
   * @return The future JSON result
   */
  def deleteResource(id: String): Future[JsValue] = WS.url(baseUrl + "/" + id).delete().map(_.json)

  /**
   * Adding remote files to the resource
   * The API endpoint is: POST resources/[id]/content/[token]. This should be contained in the provided url
   * @param url The upload url
   * @param remoteFiles The JSON object describing the remote files
   * @return The future JSON result
   */
  def uploadRemoteFiles(url: String, remoteFiles: JsValue): Future[JsValue] = WS.url(url).post(remoteFiles).map(_.json)

  /**
   * Get resource relations
   * @param id The ID of the resource
   * @return The future JSON result
   */
  def getRelations(id: String): Future[JsValue] = WS.url(baseUrl + "/" + id + "/relations").get().map(_.json)

  /**
   * Gets an upload url for a particular resource.
   * The API endpoint is: GET resources/[id]/request-upload-url
   * @param id The ID of the resource for which the upload url is being obtained
   * @return The future JSON result
   */
  def requestUploadUrl(id: String): Future[JsValue] =
    WS.url(baseUrl + "/" + id + "/request-upload-url").get().map(_.json)

}
