package dataAccess

import play.api.{Logger, Play}
import Play.current
import play.api.libs.json.{Json, JsObject, JsValue, JsUndefined}
import play.api.libs.ws.{WS, WSResponse}
import models.User
import concurrent.Future
import concurrent.ExecutionContext.Implicits.global

/**
 * Wrappers for the resource library
 * http://ayamel.americancouncils.org/
 * @author Joshua Monson
 */
object ResourceController {

  // The resource library
  val baseUrl = Play.configuration.getString("resourceLibrary.baseUrl").get
  val clientId = Play.configuration.getString("resourceLibrary.clientId").get
  val apiKey = Play.configuration.getString("resourceLibrary.apiKey").get
  val baseResourceUrl = Play.configuration.getString("resourceLibrary.baseUrl").get + "resources"

  def decode(r:WSResponse): Option[JsValue] = try {
    Some(r.json)
  } catch {
    case _: Exception =>
      Logger.debug("Error decoding:\n${r.body}")
      None
  }

  /**
   * Resource creation
   * The API endpoint is: POST resources
   * @param resource The resource to be created
   * @return The future JSON result
   */
  def createResource(resource: JsObject, user: User): Future[Option[JsValue]] = {
    val withUser = (resource \ "clientUser") match {
      case _:JsUndefined => resource ++ Json.obj(
        "clientUser" -> Json.obj("id" -> s"user:${user.id.get}")
      )
      case _ => resource
    }
    WS.url(baseResourceUrl + s"?_key=$apiKey").post(withUser).map { r =>
      Logger.info("Resource Controller: create")
      decode(r)
    }
  }

  /**
   * Derive as much of a full resource object as possible from a given uri. Note that custom resource providers can be
   * specified in URI format, for example YouTube: youtube://txqiwrbYGrs.
   * The API endpoint is: GET resources/scan
   * @param uri The uri to scan
   * @return The future JSON results
   */
  def scan(uri: String): Future[Option[JsValue]] = WS.url(baseResourceUrl + "/scan?uri=" + uri).get().map { r =>
    Logger.info("Resource Controller: scan")
    decode(r)
  }

  /**
   * Resource retrieval
   * The API endpoint is: GET resources/[id]
   * @param id The ID of the resource to get
   * @return The future JSON result
   */
  def getResource(id: String): Future[Option[JsValue]] = WS.url(baseResourceUrl + "/" + id).get().map { r =>
    decode(r)
  }

  /**
   * Updates the resource
   * The API endpoint is: PUT resources/[id]
   * @param id The ID of the resource to update
   * @param resource The JSON object describing the resource
   * @return The future JSON result
   */
  def updateResource(id: String, resource: JsValue): Future[Option[JsValue]] =
    WS.url(baseResourceUrl + "/" + id + s"?_key=$apiKey").put(resource).map { r =>
      Logger.info("Resource Controller: update")
      Logger.debug(resource.toString())
      decode(r)
    }

  /**
   * Deletes a resource
   * The API endpoint is: DELETE resources/[id]
   * @param id The ID of the resource to delete
   * @return The future JSON result
   */
  def deleteResource(id: String): Future[Option[JsValue]] = WS.url(baseResourceUrl + "/" + id + s"?_key=$apiKey").delete().map { r =>
    Logger.info("Resource Controller: delete")
    decode(r)
  }

  /**
   * Adding remote files to the resource
   * The API endpoint is: POST resources/[id]/content/[token]. This should be contained in the provided url
   * @param url The upload url
   * @param remoteFiles The JSON object describing the remote files
   * @return The future JSON result
   */
  def setRemoteFiles(url: String, remoteFiles: JsValue): Future[Option[JsValue]] = WS.url(url + s"?_key=$apiKey").post(remoteFiles).map { r =>
    Logger.info("Resource Controller: set remote files")
    decode(r).flatMap { json =>
      (json \ "resource") match {
        case _:JsUndefined => None
        case _ => Some(json)
      }
    }
  }

  /**
   * Get resource relations
   * @param id The ID of the resource
   * @param relationType What kind of relation
   * @return The future JSON result
   */
  def getRelations(id: String, relationType: Symbol = 'id) = {
    val idKey = if (relationType == 'subject) "subjectId" else if (relationType == 'object) "objectId" else "id"
    WS.url(baseUrl + s"relations?$idKey=$id").get().map { r =>
      decode(r)
    }
  }

  /**
   * Creates a relation
   * @param relation The relation to create
   * @return The future JSON result
   */
  def addRelation(relation: JsObject): Future[Option[JsValue]] = WS.url(baseUrl + s"relations?_key=$apiKey").post(relation).map { r =>
    Logger.info("Resource Controller: add relation")
    decode(r)
  }

  /**
   * Deletes a relation
   * @param id The ID of the relation to delete
   * @return The future JSON result
   */
  def deleteRelation(id: String): Future[Option[JsValue]] =
    WS.url(baseUrl + "relations/" + id + s"?_key=$apiKey").delete().map { r =>
      Logger.info("Resource Controller: delete relation")
      decode(r)
    }

  /**
   * Gets an upload url for a particular resource.
   * The API endpoint is: GET resources/[id]/request-upload-url
   * @param id The ID of the resource for which the upload url is being obtained
   * @return The future JSON result
   */
  def requestUploadUrl(id: String): Future[Option[JsValue]] =
    WS.url(baseResourceUrl + "/" + id + s"/request-upload-url?_key=$apiKey").get().map { r =>
      Logger.info("Resource Controller: request upload url")
      decode(r)
    }

}
