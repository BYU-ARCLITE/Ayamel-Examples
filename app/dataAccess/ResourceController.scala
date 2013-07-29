package dataAccess

import play.api.Play
import Play.current
import play.api.libs.json.{JsObject, Json, JsValue}
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
  val baseResourceUrl = Play.configuration.getString("resourceLibrary.baseUrl").get + "resources"
//  val baseUrl = "http://localhost:9005/api/v1/resources"

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
    WS.url(baseResourceUrl + "?limit=" + limit + "&order=" + order + "&skip=" + offset).get().map(_.json)
  }

  /**
   * Resource creation
   * The API endpoint is: POST resources
   * @param resource The resource to be created
   * @return The future JSON result
   */
  def createResource(resource: JsObject): Future[JsValue] = WS.url(baseResourceUrl).post(resource).map(_.json)

  /**
   * Derive as much of a full resource object as possible from a given uri. Note that custom resource providers can be
   * specified in URI format, for example YouTube: youtube://txqiwrbYGrs.
   * The API endpoint is: GET resources/scan
   * @param uri The uri to scan
   * @return The future JSON results
   */
  def scan(uri: String): Future[JsValue] = WS.url(baseResourceUrl + "/scan?uri=" + uri).get().map(_.json)

  /**
   * Resource retrieval
   * The API endpoint is: GET resources/[id]
   * @param id The ID of the resource to get
   * @return The future JSON result
   */
  def getResource(id: String): Future[JsValue] = WS.url(baseResourceUrl + "/" + id).get().map(_.json)

  /**
   * Updates the resource
   * The API endpoint is: PUT resources/[id]
   * @param id The ID of the resource to update
   * @param resource The JSON object describing the resource
   * @return The future JSON result
   */
  def updateResource(id: String, resource: JsValue): Future[JsValue] =
    WS.url(baseResourceUrl + "/" + id).put(resource).map(_.json)

  /**
   * Deletes a resource
   * The API endpoint is: DELETE resources/[id]
   * @param id The ID of the resouce to delete
   * @return The future JSON result
   */
  def deleteResource(id: String): Future[JsValue] = WS.url(baseResourceUrl + "/" + id).delete().map(_.json)

  /**
   * Adding remote files to the resource
   * The API endpoint is: POST resources/[id]/content/[token]. This should be contained in the provided url
   * @param url The upload url
   * @param remoteFiles The JSON object describing the remote files
   * @return The future JSON result
   */
  def setRemoteFiles(url: String, remoteFiles: JsValue): Future[JsValue] = WS.url(url).post(remoteFiles).map(_.json)

  /**
   * Get resource relations
   * @param id The ID of the resource
   * @param relationType What kind of relation
   * @return The future JSON result
   */
  def getRelations(id: String, relationType: Symbol = 'id) = {
    val idKey = if (relationType == 'subject) "subjectId" else if (relationType == 'object) "objectId" else "id"
    WS.url(baseUrl + s"relations?$idKey=$id").get().map(_.json)
  }

  def addRelation(relation: JsObject): Future[JsValue] = WS.url(baseUrl + "relations").post(relation).map(_.json)

  def deleteRelation(id: String): Future[JsValue] =
    WS.url(baseUrl + "relations/" + id).delete().map(_.json)

  /**
   * Gets an upload url for a particular resource.
   * The API endpoint is: GET resources/[id]/request-upload-url
   * @param id The ID of the resource for which the upload url is being obtained
   * @return The future JSON result
   */
  def requestUploadUrl(id: String): Future[JsValue] =
    WS.url(baseResourceUrl + "/" + id + "/request-upload-url").get().map(_.json)

}
