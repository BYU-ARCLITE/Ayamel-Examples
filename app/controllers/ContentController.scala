package controllers

import authentication.Authentication
import play.api.mvc.{Action, Result, Request, Controller, SimpleResult, ResponseHeader}
import service._
import models.{User, Content}
import scala.concurrent.{Future, ExecutionContext}
import ExecutionContext.Implicits.global
import anorm.NotAssigned
import service.ContentDescriptor
import dataAccess.{GoogleFormScripts, PlayGraph, ResourceController}
import java.net.{URLDecoder, URI, URL}
import play.api.libs.ws.WS
import play.api.libs.iteratee.Enumerator
import java.text.SimpleDateFormat
import java.util.Calendar

/**
 * The controller for dealing with content.
 */
object ContentController extends Controller {

  /**
   * Action mix-in to get the content from the request
   */
  def getContent(id: Long)(f: Content => Result)(implicit request: Request[_]) = {
    Content.findById(id).map( content => f(content) ).getOrElse(Errors.notFound)
  }

  /**
   * Returns a content object as JSON
   * @param id the ID of the content
   */
  def getAsJson(id: Long) = Authentication.authenticatedAction() {
    implicit request =>
      implicit user =>
        getContent(id) {
          content =>

          // A user can get the JSON if he can see the content or has provided the auth key (sharing)
            val authKey = request.queryString.get("authKey").getOrElse("")
            if (content.isVisibleBy(user) || content.shareability != Content.shareability.notShareable && content.authKey == authKey)
              Ok(content.toJson)
            else
              Forbidden
        }
  }

  /**
   * Content creation page
   */
  def createPage(page: String = "file", courseId: Long = 0) = Authentication.authenticatedAction() {
    implicit request =>
      implicit user =>
        Authentication.enforcePermission("createContent") {
          page match {
            case "url" => Ok(views.html.content.create.url(courseId))
            case "batch" => Ok(views.html.content.create.batchUrl(courseId))
            case "resource" => Ok(views.html.content.create.resource(courseId))
            case "playlist" => Ok(views.html.content.create.playlist(courseId))
            case "questions" => Ok(views.html.content.create.questionSet(courseId))
            case _ => Ok(views.html.content.create.file(courseId))
          }
        }
  }

  /**
   * Takes a URL and processes it, encoding it if necessary while preserving the query string
   * @param url The URL to process
   * @return The processed URL
   */
  def processUrl(url: String): String = {

    // Check to see if we need to encode (we will if the decoded is the same as the encoded)
    if (URLDecoder.decode(url, "utf-8") == url) {
      val urlObj = new URL(url)
      val queryString = if (url.contains("?")) url.substring(url.indexOf("?")) else ""
      new URI(urlObj.getProtocol, urlObj.getHost, urlObj.getPath, null).toString + queryString
    } else
      url
  }

  /**
   * Creates content based on the posted data (URL)
   */
  def createFromUrl(courseId: Long) = Authentication.authenticatedAction(parse.urlFormEncoded) {
    implicit request =>
      implicit user =>

        Authentication.enforcePermission("createContent") {

          // Collect the information
          val data = request.body
          val contentType = Symbol(data("contentType")(0))
          val title = data("title")(0)
          val description = data("description")(0)
//          val categories = data.get("categories").map(_.toList).getOrElse(Nil)
          val labels = data.get("labels").map(_.toList).getOrElse(Nil)
          val keywords = labels.mkString(",")
          val languages = data.get("languages").map(_.toList).getOrElse(List("eng"))

          // Get the URL and MIME. Process the URL if it is not YouTube or Brightcove
          val raw_url = data("url")(0)
          val url = if (ResourceHelper.isHTTP(raw_url)) processUrl(raw_url) else raw_url

          if (ResourceHelper.isValidUrl(url)) {
            val mime = ResourceHelper.getMimeFromUri(url)

            // Create the content
            Async {
              ResourceHelper.getUrlSize(url).flatMap { bytes =>
                val info = ContentDescriptor(title, description, keywords, url, bytes, mime, labels = labels,
                  languages = languages)
                if (courseId > 0) {
                  ContentManagement.createAndAddToCourse(info, user, contentType, courseId)
                } else {
                  ContentManagement.createContent(info, user, contentType).map { opt =>
                    opt.map { content =>
                      Redirect(routes.ContentController.view(content.id.get)).flashing("success" -> "Content added")
                    }.getOrElse {
                      Redirect(routes.ContentController.createPage("url", courseId)).flashing("error" -> "Failed to create content.")
                    }
                  }
                }
              }
            }
          } else
            Redirect(routes.ContentController.createPage("url", courseId)).flashing("error" -> "The given URL is invalid.")
        }
  }

  /**
   * Creates content based on the posted data (URL)
   */
  def createFromUrlBatch(courseId: Long) = Authentication.authenticatedAction(parse.multipartFormData) {
    implicit request =>
      implicit user =>

        Authentication.enforcePermission("createContent") {

          val file = request.body.file("file").get.ref.file
          val data = io.Source.fromFile(file).getLines().toList
          var count = 0

          Future {
            data.map(line => Future {
              // Collect the data
              val parts = line.split("\t")
              val title = parts(0)
              val description = parts(1)
              val url = parts(2)
              val contentType = Symbol(parts(3))
              val labels = parts(4).split(",").toList
              val languages = parts(5).split(",").toList
//              val categories = Nil
              val keywords = labels.mkString(",")
              val mime = ResourceHelper.getMimeFromUri(url)

              ResourceHelper.getUrlSize(url).flatMap(bytes => {
                val info = ContentDescriptor(title, description, keywords, url, bytes, mime, labels = labels,
                  languages = languages)
                ContentManagement.createContent(info, user, contentType).map(content => {
                  count += 1
                  if (count == data.size) {
                    user.sendNotification("Your batch file upload has finished.")
                  }
                })
              })
            })
          }

          Redirect(routes.Application.home()).flashing("info" -> "We have started processing your batch file. You will receive a notification when it is done.")
        }
  }

  /**
   * Creates content based on the posted data (File)
   */
  def createFromFile(courseId: Long) = Authentication.authenticatedAction(parse.multipartFormData) {
    implicit request =>
      implicit user =>

        Authentication.enforcePermission("createContent") {

          // Collect the information
          val data = request.body.dataParts
          val contentType = Symbol(data("contentType")(0))
          val title = data("title")(0)
          val description = data("description")(0)
//          val categories = data.get("categories").map(_.toList).getOrElse(Nil)
          val labels = data.get("labels").map(_.toList).getOrElse(Nil)
          val keywords = labels.mkString(",")
          val languages = data.get("languages").map(_.toList).getOrElse(List("eng"))
          lazy val redirect = Redirect(routes.ContentController.createPage("file", courseId))

          // Upload the file
          request.body.file("file").map { file =>
            Async {
              FileUploader.normalizeAndUploadFile(file).flatMap {
                case Some(url) =>
                  // Create the content
                  val info = ContentDescriptor(title, description, keywords, url, file.ref.file.length(), file.contentType.get,
                    labels = labels, languages = languages)
                  ContentManagement.createContent(info, user, contentType).map {
                    case Some(content) =>
                      Redirect(routes.ContentController.view(content.id.get))
                        .flashing("success" -> "Content added")
                    case None =>
                      redirect.flashing("error" -> "Failed to create content")
                  }
                case None =>
                  Future(redirect.flashing("error" -> "Failed to upload file"))
              }
            }
          }.getOrElse {
            redirect.flashing("error" -> "Missing file")
          }
        }
  }

  /**
   * Creates content based on the posted data (File)
   */
  def createFromResource(courseId: Long) = Authentication.authenticatedAction(parse.urlFormEncoded) {
    implicit request =>
      implicit user =>

        Authentication.enforcePermission("createContent") {

          // Create from resource
          val resourceId = request.body("resourceId")(0)
          Async {
            ResourceController.getResource(resourceId).map { response =>
              response.map { json =>
                val code = (json \ "response" \ "code").as[Int]
                if (code == 200) {
                  val title = (json \ "resource" \ "title").as[String]
                  val resourceType = (json \ "resource" \ "type").as[String]

                  if (resourceType == "data" || resourceType == "archive") {
                     Redirect(routes.ContentController.createPage("resource", courseId))
                    .flashing("error" -> "Can't create content from a data or archive resources.")
                  } else {
                    //TODO: properly handle collections
                    //TODO: update our code to match the resource library, rather than special-casing "text"
                    val contentType = if(resourceType == "document") "text" else resourceType
                    val content = Content(NotAssigned, title, Symbol(contentType), "", resourceId).save
                    user.addContent(content)
                    Redirect(routes.ContentController.view(content.id.get))
                      .flashing("success" -> "Content added.")
                  }
                } else
                  Redirect(routes.ContentController.createPage("resource", courseId))
                    .flashing("error" -> "That resource doesn't exist")
              }.getOrElse {
                Redirect(routes.ContentController.createPage("resource", courseId))
                  .flashing("error" -> "Couldn't access resource")
              }
            }
          }
        }
  }

  /**
   * Creates content based on the posted data (File)
   */
  def createPlaylist(courseId: Long) = Authentication.authenticatedAction(parse.urlFormEncoded) {
    implicit request =>
      implicit user =>

        Authentication.enforcePermission("createContent") {

          Async {
            // Create the node content
            PlayGraph.Author.NodeContent.create("").flatMap(nodeContentJson => {
              val nodeContentId = (nodeContentJson \ "nodeContent" \ "id").as[Long]

              // Create the node
              PlayGraph.Author.Node.create(nodeContentId, "data").flatMap(nodeJson => {
                val nodeId = (nodeJson \ "node" \ "id").as[Long]

                // Create the graph
                PlayGraph.Author.Graph.create(nodeId).map(graphJson => {
                  val graphId = (graphJson \ "graph" \ "id").as[Long]

                  // Create playlist
                  val title = request.body("title")(0)
                  val labels = request.body.get("labels").map(_.toList).getOrElse(Nil)
                  val description = request.body("description")(0)
                  val content = Content(NotAssigned, title, 'playlist, "", graphId.toString, labels = labels).save
                  content.setSetting("description", List(description))
                  user.addContent(content)

                  Redirect(routes.Playlists.about(content.id.get))
                })
              })
            })
          }
        }
  }

  /**
   * Creates content based on the posted data (File)
   */
  def createQuestionSet(courseId: Long) = Authentication.authenticatedAction(parse.urlFormEncoded) {
    implicit request =>
      implicit user =>

        Authentication.enforcePermission("createContent") {

          val title = request.body("title")(0)
          val labels = request.body.get("labels").map(_.toList).getOrElse(Nil)
          val description = request.body("description")(0)

          Async {
            GoogleFormScripts.createForm(title, user.email.get).map(formId => {
              val content = Content(NotAssigned, title, 'questions, "", formId, labels = labels).save
              content.setSetting("description", List(description))
              user.addContent(content)

              Redirect(routes.QuestionSets.about(content.id.get))
            })
          }
        }
  }

  /**
   * Creates a copy of an existing content object
   */
  def cloneContent(id: Long) = Authentication.authenticatedAction() {
    implicit request =>
      implicit user =>
        Authentication.enforcePermission("createContent") {
          Content.findById(id) match {
          case Some(content) => {
            val copied = content.copy(id = NotAssigned).save
            user.addContent(copied)
            Redirect(routes.ContentController.view(copied.id.get))
              .flashing("success" -> "Content Cloned")
          }
          case None =>
            Redirect(routes.ContentController.mine())
              .flashing("error" -> "No Such Content")
          }
        }
  }

  /**
   * Content view page
   */
  def view(id: Long) = Authentication.authenticatedAction() {
    implicit request =>
      implicit user =>
        getContent(id) { content =>
          // Check for playlists
          if (content.contentType == 'playlist) {
            Redirect(routes.Playlists.about(id))
          } else if (content.contentType == 'questions) {
            Redirect(routes.QuestionSets.about(id))
          } else if (content.contentType != 'data) {
            //TODO: make this a whitelist instead of blacklist
            // Check that the user can view the content
            if (content isVisibleBy user) {
              if (MobileDetection.isMobile())
                Ok(views.html.content.viewMobile(content, ResourceController.baseUrl))
              else
                Ok(views.html.content.view(content, ResourceController.baseUrl))
            } else
              Errors.forbidden
          } else {
            Redirect(routes.Application.search)
              .flashing("error" -> "Requested content uses invalid resource")
          }
        }
  }

  /**
   * Content management page
   */
  def manageContent() = Authentication.authenticatedAction() {
    implicit request =>
      implicit user =>
        Ok(views.html.content.batchEdit(user.getContent))
  }

  /**
   * Content stats page
   */
  def stats(id: Long) = Authentication.authenticatedAction() {
    implicit request =>
      implicit user =>
        getContent(id) { content =>
          // Only owners can view stats
          if (content isEditableBy user) {
            Ok(views.html.content.stats(content, ResourceController.baseUrl))
          } else
            Errors.forbidden
        }
  }

  /**
   * Takes the stats and prepares an Excel file with them in it, then offers the file for download
   * @param id The ID of the content for which the stats are being downloaded
   */
  def downloadStats(id: Long) = Authentication.authenticatedAction() {
    implicit request =>
      implicit user =>
        getContent(id) { content =>
          // Only owners can view stats
          if (content isEditableBy user) {
            val activity = content.getActivity("")
            val byteStream = ExcelWriter.writeActivity(activity)
            val output = Enumerator.fromStream(byteStream)
            val downloadURI = {
                val format = new SimpleDateFormat("yyyy-M-d")
                val contentName = content.name
                "attachment; filename=\"" + format.format(Calendar.getInstance().getTime()) +
                "." + contentName.replaceAll(" ","-") +".xlsx\""
            }
            SimpleResult(
              header = ResponseHeader(200),
              body = output
            ).withHeaders("Content-Type" -> "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
            .withHeaders(CONTENT_DISPOSITION -> downloadURI)
          } else
            Errors.forbidden
        }
  }

  /**
   * Deletes the stats pertaining to a certain content object
   * @param id The ID of the content object
   */
  def clearStats(id: Long) = Authentication.authenticatedAction() {
    implicit request =>
      implicit user =>
        getContent(id) { content =>
          // Only owners can clear stats
          if (content isEditableBy user) {
            content.getActivity("").foreach(_.delete())
            Redirect(routes.ContentController.stats(content.id.get)).flashing("info" -> "Data cleared")
          } else
            Errors.forbidden
        }
  }

  /**
   * When content is shared, this is the endpoint that viewers come to. No authentication is necessary to view the
   * content if its share settings are set appropriately.
   * @param id The ID of the content
   * @param authKey The content's access key
   */
  def shareAccess(id: Long, authKey: String) = Action {
    implicit request =>
      getContent(id) { content =>
        // Check that everything is in place to view the content
        if (content.authKey == authKey && content.shareability != Content.shareability.notShareable) {
          val embed = request.queryString.get("embed").exists(_(0).toBoolean)
          Ok(views.html.content.share.view(content, ResourceController.baseUrl, embed))
        } else
          Ok("You are not allowed to view this content")
      }
  }


  /**
   * Content deletion endpoint
   */
  def delete(id: Long) = Authentication.authenticatedAction() {
    implicit request =>
      implicit user =>
        getContent(id) { content =>
          // Make sure the user is able to edit
          if (content isEditableBy user) {
            content.delete()
            Redirect(routes.ContentController.mine()).flashing("success" -> "Content deleted.")
          } else
            Errors.forbidden
        }
  }

  /**
   * "My Content" page
   */
  def mine = Authentication.authenticatedAction() {
    implicit request =>
      implicit user =>
        Ok(views.html.content.mine())
  }

}
