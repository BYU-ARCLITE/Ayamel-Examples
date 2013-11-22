package service

import models.{Course, User, Content}
import play.api.libs.json.{JsArray, JsObject}
import dataAccess.ResourceController
import scala.concurrent._
import scala.concurrent.duration._
import ExecutionContext.Implicits.global

/**
 * There are several permissions to check:
 *  - Can view
 *     - Personal that are enabled
 *     - Course that are enabled
 *     - Global that are enabled -or- global that are enabled by the course
 *  - Can enable
 *  - Can edit
 *
 */
class DocumentPermissionChecker(user: User, content: Content, course: Option[Course], documentType: DocumentType) {

  val personalPrefix = "user_" + user.id.get + ":"
  val coursePrefix = course.map("course_" + _.id.get + ":").getOrElse("")

  // Filters

  // A document resource is personal if clientUser.id = "user:ID"
  def personalFilter(resource: JsObject): Boolean =
    try {
      val id = (resource \ "clientUser" \ "id").as[String]
      id.startsWith("user") && id.split(":")(1).toLong == user.id.get
    } catch {
      case _: Throwable => false
    }

  def courseFilter(resource: JsObject): Boolean =
    try {
      val id = (resource \ "clientUser" \ "id").as[String]
      id.startsWith("course") && id.split(":")(1).toLong == course.get.id.get
    } catch {
      case _: Throwable => false
    }

  def globalFilter(resource: JsObject): Boolean =
    try {
      (resource \ "clientUser" \ "id").asOpt[String].isEmpty
    } catch {
      case _: Throwable => true
    }

  // Permission checkers

  def enabled(resource: JsObject, prefix: String): Boolean = {
    val typeName = documentType.name
    val key = s"${prefix}enabled$typeName"
    val id = (resource \ "id").as[String]
    content.settings.get(key).exists(_.split(",").contains(id))
  }

  /**
   * Checks if the user is allowed to view this particular resource
   */
  def canView(resource: JsObject): Boolean = {
    if (personalFilter(resource)) // Is it a personal document?
      enabled(resource, personalPrefix) // Yes. Allow it if it's enabled
    else { // No. Are we in the context of a course
      if (course.isDefined) { // Yes. Allow it if it's enabled
        enabled(resource, coursePrefix)
      } else { // No. Allow it if it's global and enabled
        globalFilter(resource) && enabled(resource, "")
      }
    }
  }

  /**
   * Checks if the user is allowed to enable this particular resource
   */
  def canEnable(resource: JsObject): Boolean = {
    if (personalFilter(resource)) // Is it a personal document?
      true
    else { // No. Are we in the context of a course
      if (course.isDefined) { // Yes. Is the user allowed to edit the course?
        if (user canEdit course.get) { // Yes. Is it a course document
          if (courseFilter(resource)) // Yes. Allow it
            true
          else { // No. Allow it if it is enabled globally
            globalFilter(resource) && enabled(resource, "")
          }
        } else // No. Allow it if the user can edit the content and it's global (owner or admin)
          globalFilter(resource) && (content isEditableBy user)
      } else { // No. Allow it if the user can edit the content and it's global (owner or admin)
        globalFilter(resource) && (content isEditableBy user)
      }
    }
  }

  /**
   * Checks if the user is allowed to edit this particular resource
   */
  def canEdit(resource: JsObject): Boolean = {
    // Is it a personal document?
    if (personalFilter(resource)) // Yes. Allow it
      true
    else {
      // Is the document global
      if (globalFilter(resource)) // Yes. Allow it if the user is owner
        content isEditableBy user
      else { // No. Are we in the context of a course
        if (course.isDefined) { // Yes. Allow it if the user is a teacher and the doc is a course doc
          courseFilter(resource) && user.canEdit(course.get)
        } else // No. Then don't allow it
          false
      }
    }
  }

  /**
   * Checks if the user is allowed to publish this particular resource
   */
  def canPublish(resource: JsObject): Boolean = {
    // Only owners/admins can publish
    if (content isEditableBy user) {
      // Only allow resources which have been submitted
      try {
        (resource \ "clientUser" \ "id").as[String].endsWith("request")
      } catch {
        case _: Throwable => false
      }
    } else
      false
  }

  // Resource getters

  def getAll: Future[List[JsObject]] = {
    // Get the relations
    ResourceController.getRelations(content.resourceId).flatMap { response =>
      response match {
        case Some(json) => {
          val relations = (json \ "relations").as[JsArray].value.toList.map(_.as[JsObject])
          future {
            relations.filter(documentType.filter).map { relation =>
              Await.result(
                ResourceController.getResource((relation \ documentType.relation).as[String])
                  .map(_.map(json => (json \ "resource").as[JsObject])),
                Duration.Inf
              )
            }.collect { case Some(json) => json }
          }
        }
        case None =>
          Future(List.empty[JsObject])
      }
    }
  }

  def getViewable: Future[List[JsObject]] = getAll.map(_.filter(canView))
  def getEnableable: Future[List[JsObject]] = getAll.map(_.filter(canEnable))
  def getEditable: Future[List[JsObject]] = getAll.map(_.filter(canEdit))
  def getPublishable: Future[List[JsObject]] = getAll.map(_.filter(canPublish))

}

object DocumentPermissionChecker {
  object documentTypes {

    val captionTrack = DocumentType("CaptionTracks", r => (r \ "type").as[String] == "transcript_of", "subjectId")

    val annotations = DocumentType("AnnotationDocuments", r => (r \ "type").as[String] == "references", "subjectId")
  }
}

case class DocumentType(name: String, filter: JsObject => Boolean, relation: String)