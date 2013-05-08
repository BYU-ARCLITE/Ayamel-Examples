package controllers

import authentication.Authentication
import play.api.mvc.{Action, Result, Request, Controller}
import service._
import models.{User, Content}
import play.api.Play
import Play.current
import scala.concurrent.ExecutionContext
import ExecutionContext.Implicits.global
import anorm.NotAssigned
import service.ContentDescriptor
import dataAccess.{PlayGraph, ResourceController}

/**
 * The controller for dealing with content.
 */
object ContentController extends Controller {

  /**
   * Action mix-in to get the content from the request
   */
  def getContent(id: Long)(f: Content => Result)(implicit request: Request[_]) = {
    val content = Content.findById(id)
    if (content.isDefined) {
      f(content.get)
    } else
      Errors.notFound
  }

  def getAsJson(id: Long) = Authentication.authenticatedAction() {
    implicit request =>
      implicit user =>
        getContent(id) {
          content =>

          // A user can get the JSON if he can see the content or has provided the auth key (sharing)
            val authKey = request.queryString.get("authKey").getOrElse("")
            if (content.isVisibleBy(user) || (content.shareability != Content.shareability.notShareable && content.authKey == authKey))
              Ok(content.toJson)
            else
              Forbidden

        }
  }

  /**
   * Content creation page
   */
  def createPage(page: String = "file") = Authentication.authenticatedAction() {
    implicit request =>
      implicit user =>
      // Guests cannot create content
        Authentication.enforceNotRole(User.roles.guest) {
          if (page == "url")
            Ok(views.html.content.create.url())
          else if (page == "resource")
            Ok(views.html.content.create.resource())
          else if (page == "playlist")
            Ok(views.html.content.create.playlist())
          else
            Ok(views.html.content.create.file())
        }
  }

  /**
   * Creates content based on the posted data (URL)
   */
  def createFromUrl = Authentication.authenticatedAction(parse.urlFormEncoded) {
    implicit request =>
      implicit user =>

      // Guests cannot create content
        Authentication.enforceNotRole(User.roles.guest) {
          // Collect the information
          val data = request.body
          val contentType = Symbol(data("contentType")(0))
          val title = data("title")(0)
          val description = data("description")(0)
          val keywords = data("keywords")(0)
          val categories = data.get("categories").map(_.toList).getOrElse(Nil)
          val labels = data.get("labels").map(_.toList).getOrElse(Nil)
          val url = data("url")(0)
          val mime = ResourceHelper.getMimeFromUri(url)

          // Create the content
          val info = ContentDescriptor(title, description, keywords, categories, url, mime, labels = labels)
          Async {
            ContentManagement.createContent(info, user, contentType).map(content => {
              Redirect(routes.ContentController.view(content.id.get)).flashing("success" -> "Content added")
            })
          }
        }
  }

  /**
   * Creates content based on the posted data (File)
   */
  def createFromFile = Authentication.authenticatedAction(parse.multipartFormData) {
    implicit request =>
      implicit user =>

      // Guests cannot create content
        Authentication.enforceNotRole(User.roles.guest) {

          // Collect the information
          val data = request.body.dataParts
          val contentType = Symbol(data("contentType")(0))
          val title = data("title")(0)
          val description = data("description")(0)
          val keywords = data("keywords")(0)
          val categories = data.get("categories").map(_.toList).getOrElse(Nil)
          val labels = data.get("labels").map(_.toList).getOrElse(Nil)

          Async {
            // Upload the file
            val file = request.body.file("file").get
            FileUploader.normalizeAndUploadFile(file).flatMap {
              url =>

              // Create the content
                val info = ContentDescriptor(title, description, keywords, categories, url, file.contentType.get, labels = labels)
                ContentManagement.createContent(info, user, contentType).map {
                  content =>
                    Redirect(routes.ContentController.view(content.id.get)) flashing ("success" -> "Content added")
                }
            }
          }
        }
  }

  /**
   * Creates content based on the posted data (File)
   */
  def createFromResource = Authentication.authenticatedAction(parse.urlFormEncoded) {
    implicit request =>
      implicit user =>

      // Guests cannot create content
        Authentication.enforceNotRole(User.roles.guest) {

          // Create from resource
          val resourceId = request.body("resourceId")(0)
          Async {
            ResourceController.getResource(resourceId).map {
              json =>
                val code = (json \ "response" \ "code").as[Int]
                if (code == 200) {
                  val title = (json \ "resource" \ "title").as[String]
                  val contentType = (json \ "resource" \ "type").as[String]
                  val content = Content(NotAssigned, title, Symbol(contentType), "", resourceId).save
                  user.addContent(content)

                  Redirect(routes.ContentController.view(content.id.get))
                } else
                  Redirect(routes.ContentController.createPage("resource")).flashing("error" -> "That resource doesn't exist")
            }
          }
        }
  }

  /**
   * Creates content based on the posted data (File)
   */
  def createPlaylist = Authentication.authenticatedAction(parse.urlFormEncoded) {
    implicit request =>
      implicit user =>

      // Guests cannot create content
        Authentication.enforceNotRole(User.roles.guest) {

          Async {
            // Create the node content
            val nodeContent = SerializationTools.serializeMap(Map("status" -> "started"))
            PlayGraph.Author.NodeContent.create(nodeContent).flatMap(nodeContentJson => {
              val nodeContentId = (nodeContentJson \ "nodeContent" \ "id").as[Long]

              // Create the node
              PlayGraph.Author.Node.create(nodeContentId, "data", "0").flatMap(nodeJson => {
                val nodeId = (nodeJson \ "node" \ "id").as[Long]

                // Create the graph
                PlayGraph.Author.Graph.create(nodeId).map(graphJson => {
                  val graphId = (graphJson \ "graph" \ "id").as[Long]

                  // Create playlist
                  val title = request.body("title")(0)
                  val content = Content(NotAssigned, title, 'playlist, "", graphId.toString).save
                  user.addContent(content)

                  Redirect(routes.ContentController.view(content.id.get))
                })
              })
            })
          }
        }
  }

  /**
   * Content view page
   */
  def view(id: Long) = Authentication.authenticatedAction() {
    implicit request =>
      implicit user =>
        getContent(id) {
          content =>

          // Check that the user can view the content
            if (content isVisibleBy user) {
              val resourceLibraryUrl = Play.configuration.getString("resourceLibrary.baseUrl").get
              Ok(views.html.content.view(content, resourceLibraryUrl))
            } else
              Errors.forbidden
        }
  }


  /**
   * Content stats page
   */
  def stats(id: Long) = Authentication.authenticatedAction() {
    implicit request =>
      implicit user =>
        getContent(id) {
          content =>

          // Only owners can view stats
            if (content isEditableBy user) {
              val resourceLibraryUrl = Play.configuration.getString("resourceLibrary.baseUrl").get
              Ok(views.html.content.stats(content, resourceLibraryUrl))
            } else
              Errors.forbidden
        }
  }


  def downloadStats(id: Long) = Authentication.authenticatedAction() {
    implicit request =>
      implicit user =>
        getContent(id) {
          content =>

          // Only owners can view stats
            if (content isEditableBy user) {
              val activity = content.getActivity("")
              Async {
                ExcelWriter.writeActivity(activity).map {
                  url =>
                    Redirect(url)
                }
              }
            } else
              Errors.forbidden
        }
  }


  def clearStats(id: Long) = Authentication.authenticatedAction() {
    implicit request =>
      implicit user =>
        getContent(id) {
          content =>

          // Only owners can clear stats
            if (content isEditableBy user) {
              content.getActivity("").foreach(_.delete())
              Redirect(routes.ContentController.stats(content.id.get)).flashing("info" -> "Data cleared")
            } else
              Errors.forbidden
        }
  }


  def shareAccess(id: Long, authKey: String) = Action {
    implicit request =>
      getContent(id) {
        content =>

        // Check that everything is in place to view the content
          if (content.authKey == authKey && content.shareability != Content.shareability.notShareable) {
            val resourceLibraryUrl = Play.configuration.getString("resourceLibrary.baseUrl").get
            val embed = request.queryString.get("embed").map(_(0).toBoolean).getOrElse(false)
            Ok(views.html.content.share.view(content, resourceLibraryUrl, embed))
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
        getContent(id) {
          content =>

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

      // Guests cannot create content
        Authentication.enforceNotRole(User.roles.guest) {
          Ok(views.html.content.mine())
        }
  }

  /**
   * Public content page
   */
  def public = Authentication.authenticatedAction() {
    implicit request =>
      implicit user =>
        val content = Content.listPublic
        Ok(views.html.content.public(content))
  }


}
