package dataAccess

import service.joshmonson.oauth.{OAuthRequest, OAuthKey}
import play.api.Play
import play.api.Play.current
import play.api.libs.json.{JsString, JsValue}
import scala.concurrent.{ExecutionContext, Future}
import play.api.libs.ws.WS
import java.net.URLEncoder
import ExecutionContext.Implicits.global

/**
 * A wrapper for the PlayGraph API.
 * The keys and secrets are pulled out of the configuration file
 */
object PlayGraph {

//    val host = "http://localhost:9001/"
  val host = Play.configuration.getString("playgraph.host").get

//    private val authorKey = OAuthKey(
//      "o0vouu51k3ufsrms0avipdn1e",
//      "gt7ksedniu1t5lgvrie8uh2pqa",
//      "", ""
//    )

  private val authorKey = OAuthKey(
    Play.configuration.getString("playgraph.author.key").get,
    Play.configuration.getString("playgraph.author.secret").get,
    "", ""
  )

//  val playerKey = OAuthKey(
//    "caqehbk929smfstfgk6u9o1s8f",
//    "nffupsom73ra6p0d3ub3fgc0oe",
//    "", ""
//  )

  val playerKey = OAuthKey(
    Play.configuration.getString("playgraph.player.key").get,
    Play.configuration.getString("playgraph.player.secret").get,
    "", ""
  )

  private val urlEncodedContentType = "application/x-www-form-urlencoded"

  private def urlEncode(data: Map[String, String]): String =
    data.map(d => d._1 + "=" + URLEncoder.encode(d._2, "UTF-8")).mkString("&")

  private def sign(key: OAuthKey, path: String, method: String, postBody: Map[String, String] = Map()): String = {
    val urlEncodedContent = if (method == "POST") urlEncode(postBody) else ""
    val contentTypeHeader = if (method == "POST") Some(urlEncodedContentType) else None
    OAuthRequest(None, contentTypeHeader, host, "", urlEncodedContent, method, path).getAuthorizationHeader(key)
  }

  object Author {

    /**
     * API Wrappers for authoring graphs
     */
    object Graph {
      /**
       * Create a graph
       * @param startNode The starting node in this graph
       * @return A future json. Example: {"success":true,"graph":{"id":4,"startNode":10}}
       */
      def create(startNode: Long): Future[JsValue] = {

        val path = "api/v1/author/graph"
        val postBody = Map("startNode" -> startNode.toString)
        val auth = sign(authorKey, path, "POST", postBody)

        WS.url(host + path)
          .withHeaders("Authorization" -> auth, "Content-Type" -> urlEncodedContentType)
          .post(urlEncode(postBody)).map(_.json)
      }

      /**
       * Gets a graph
       * @param id The id of the graph
       * @return A future json
       */
      def get(id: Long): Future[JsValue] = {
        val path = "api/v1/author/graph/" + id
        val auth = sign(authorKey, path, "GET")
        WS.url(host + path).withHeaders("Authorization" -> auth).get().map(_.json)
      }

      /**
       * Update a graph
       * @param startNode The starting node in this graph
       * @return A future json
       */
      def update(id: Long, startNode: Long): Future[JsValue] = {

        val path = "api/v1/author/graph/" + id
        val postBody = Map("startNode" -> startNode.toString)
        val auth = sign(authorKey, path, "POST", postBody)

        WS.url(host + path)
          .withHeaders("Authorization" -> auth, "Content-Type" -> urlEncodedContentType)
          .post(urlEncode(postBody)).map(_.json)
      }

      /**
       * Deletes a graph
       * @param id The id of the graph
       * @return Confirmation
       */
      def delete(id: Long): Future[JsValue] = {
        val path = "api/v1/author/graph/" + id
        val auth = sign(authorKey, path, "DELETE")
        WS.url(host + path).withHeaders("Authorization" -> auth).delete().map(_.json)
      }
    }

    /**
     * API Wrappers for authoring node content objects
     */
    object NodeContent {

      /**
       * Creates a node content
       * @param content The content to saved
       * @return Future Json. Example: {"success":true,"nodeContent":{"id":8,"content":"This is test content"}}
       */
      def create(content: String): Future[JsValue] = {

        val path = "api/v1/author/nodecontent"
        val postBody = Map("content" -> content)
        val auth = sign(authorKey, path, "POST", postBody)

        WS.url(host + path)
          .withHeaders("Authorization" -> auth, "Content-Type" -> urlEncodedContentType)
          .post(urlEncode(postBody)).map(_.json)
      }

      /**
       * Gets a node content
       * @param id The id of the node content
       * @return Future json
       */
      def get(id: Long): Future[JsValue] = {
        val path = "api/v1/author/nodecontent/" + id
        val auth = sign(authorKey, path, "GET")

        WS.url(host + path).withHeaders("Authorization" -> auth).get().map(_.json)
      }

      /**
       * Updates a node content
       * @param id The id of the node content
       * @param content The new content
       * @return Future json
       */
      def update(id: Long, content: String): Future[JsValue] = {

        val path = "api/v1/author/nodecontent/" + id
        val postBody = Map("content" -> content)
        val auth = sign(authorKey, path, "POST", postBody)

        WS.url(host + path)
          .withHeaders("Authorization" -> auth, "Content-Type" -> urlEncodedContentType)
          .post(urlEncode(postBody)).map(_.json)
      }

      /**
       * Deletes a node content
       * @param id The id of the node content
       * @return Confirmation
       */
      def delete(id: Long): Future[JsValue] = {
        val path = "api/v1/author/nodecontent/" + id
        val auth = sign(authorKey, path, "DELETE")

        WS.url(host + path).withHeaders("Authorization" -> auth).delete().map(_.json)
      }

    }

    /**
     * API wrappers for authoring node pools
     */
    object NodePool {
      /**
       * Create a node pool
       * @param nodes The list of nodes that will part of this pool
       * @param script The finish script
       * @return A future json.
       */
      def create(nodes: List[Long], script: String): Future[JsValue] = {

        val path = "api/v1/author/nodepool"
        val postBody = Map(
          "nodes" -> nodes.mkString(","),
          "script" -> script
        )
        val auth = sign(authorKey, path, "POST", postBody)

        WS.url(host + path)
          .withHeaders("Authorization" -> auth, "Content-Type" -> urlEncodedContentType)
          .post(urlEncode(postBody)).map(_.json)
      }

      /**
       * Gets a node pool
       * @param id The id of the node pool
       * @return A future json
       */
      def get(id: Long): Future[JsValue] = {
        val path = "api/v1/author/nodepool/" + id
        val auth = sign(authorKey, path, "GET")
        WS.url(host + path).withHeaders("Authorization" -> auth).get().map(_.json)
      }

      /**
       * Update a node pool
       * @param id The ID of the node pool
       * @param nodes The list of nodes that will part of this pool
       * @param script The finish script
       * @return A future json
       */
      def update(id: Long, nodes: Option[List[Long]] = None, script: Option[String] = None): Future[JsValue] = {

        val path = "api/v1/author/nodepool/" + id
        val postBody = Map(
          "nodes" -> nodes.map(_.mkString(",")),
          "script" -> script
        ).filter(_._2.isDefined).mapValues(_.get)
        val auth = sign(authorKey, path, "POST", postBody)

        WS.url(host + path)
          .withHeaders("Authorization" -> auth, "Content-Type" -> urlEncodedContentType)
          .post(urlEncode(postBody)).map(_.json)
      }

      /**
       * Deletes a node pool
       * @param id The id of the node pool
       * @return Confirmation
       */
      def delete(id: Long): Future[JsValue] = {
        val path = "api/v1/author/nodepool/" + id
        val auth = sign(authorKey, path, "DELETE")
        WS.url(host + path).withHeaders("Authorization" -> auth).delete().map(_.json)
      }
    }

    /**
     * API wrappers for authoring nodes
     */
    object Node {

      /**
       * Create a node
       * @param contentId The ID of the content
       * @param contentType The type of the content
       * @param script The finish script
       * @param labels A list of labels
       * @return A future json. Example: {"success":true,"node":{"id":10,"contentId":8,"contentType":"data","script":"0","labels":[""]}}
       */
      def create(contentId: Long, contentType: String, script: String, labels: List[String] = Nil): Future[JsValue] = {

        val path = "api/v1/author/node"
        val postBody = Map(
          "contentId" -> contentId.toString,
          "contentType" -> contentType,
          "script" -> script,
          "labels" -> labels.mkString(",")
        )
        val auth = sign(authorKey, path, "POST", postBody)

        WS.url(host + path)
          .withHeaders("Authorization" -> auth, "Content-Type" -> urlEncodedContentType)
          .post(urlEncode(postBody)).map(_.json)
      }

      /**
       * Gets a node
       * @param id The id of the node
       * @return A future json
       */
      def get(id: Long): Future[JsValue] = {
        val path = "api/v1/author/node/" + id
        val auth = sign(authorKey, path, "GET")
        WS.url(host + path).withHeaders("Authorization" -> auth).get().map(_.json)
      }

      /**
       * Update a node
       * @param id The ID of the node
       * @param contentId The ID of the content
       * @param contentType The type of the content
       * @param script The finish script
       * @param labels A list of labels
       * @return A future json
       */
      def update(id: Long, contentId: Option[Long] = None, contentType: Option[String] = None,
                 script: Option[String] = None, labels: Option[List[String]] = None): Future[JsValue] = {

        val path = "api/v1/author/node/" + id
        val postBody = Map(
          "contentId" -> contentId.map(_.toString),
          "contentType" -> contentType,
          "script" -> script,
          "labels" -> labels.map(_.mkString(","))
        ).filter(_._2.isDefined).mapValues(_.get)
        val auth = sign(authorKey, path, "POST", postBody)

        WS.url(host + path)
          .withHeaders("Authorization" -> auth, "Content-Type" -> urlEncodedContentType)
          .post(urlEncode(postBody)).map(_.json)
      }

      /**
       * Deletes a node
       * @param id The id of the node
       * @return Confirmation
       */
      def delete(id: Long): Future[JsValue] = {
        val path = "api/v1/author/node/" + id
        val auth = sign(authorKey, path, "DELETE")
        WS.url(host + path).withHeaders("Authorization" -> auth).delete().map(_.json)
      }

    }

  }

  /**
   * A wrapper for the PlayGraph Player API
   */
  object Player {

    /**
     * Start a new session
     * @param graph The graph to use
     * @return A future json. Example: {"sessionId":2}
     */
    def start(graph: Long): Future[JsValue] = {
      val path = "api/v1/player/start"
      val postBody = Map("graph" -> graph.toString)
      val auth = sign(playerKey, path, "POST", postBody)

      WS.url(host + path)
        .withHeaders("Authorization" -> auth, "Content-Type" -> urlEncodedContentType)
        .post(urlEncode(postBody)).map(_.json)
    }

    /**
     * Update a graph traversal session
     * @param sessionId The id of the session
     * @param sessionData Additional data submitted from the current node
     * @return A future json. Examples: {"status":"continue"} {"status":"done"} {"message":"This session is already completed"}
     */
    def update(sessionId: Long, sessionData: Map[String, String] = Map()): Future[JsValue] = {
      val path = "api/v1/player/update"
      val postBody = sessionData.updated("sessionId", sessionId.toString)
      val auth = sign(playerKey, path, "POST", postBody)

      WS.url(host + path)
        .withHeaders("Authorization" -> auth, "Content-Type" -> urlEncodedContentType)
        .post(urlEncode(postBody)).map(_.json)
    }

    /**
     * Get the content at the current node
     * @param sessionId The id of the session
     * @return The content
     */
    def get(sessionId: Long): Future[String] = {
      val path = "api/v1/player/content/" + sessionId
      val auth = sign(playerKey, path, "GET")

      WS.url(host + path).withHeaders("Authorization" -> auth).get().map(_.body)
    }
  }

}
