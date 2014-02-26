package service

import models.{Course, User, Content}
import play.api.Logger
import play.api.libs.json.{JsArray, JsObject, JsString}
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
  def personalFilter(resource: JsObject): Boolean = try { //try block handles unchecked gets
    val id = (resource \ "clientUser" \ "id").as[String]
    id.startsWith("user") && id.split(":")(1).toLong == user.id.get
  } catch {
    case _: Throwable => false
  }

  def courseFilter(resource: JsObject): Boolean = try { //try block handles unchecked gets
    val id = (resource \ "clientUser" \ "id").as[String]
    id.startsWith("course") && id.split(":")(1).toLong == course.get.id.get
  } catch {
    case _: Throwable => false
  }

  def globalFilter(resource: JsObject): Boolean = true
    // No idea what this check is actually supposed to do
    // (resource \ "clientUser" \ "id").isInstanceOf[JsString]

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
    (personalFilter(resource) && enabled(resource, personalPrefix)) || {
      course match { //Are we in the context of a course
        // Yes. Allow it if it's enabled
        case Some(_) => enabled(resource, coursePrefix)
        // No. Allow it if it's global and enabled
        case None => globalFilter(resource) && enabled(resource, "")
      }
    }
  }

  /**
   * Checks if the user is allowed to enable this particular resource
   */
  def canEnable(resource: JsObject): Boolean = {
    personalFilter(resource) || {
      course match { // Are we in the context of a course?
        // Yes. Is the user allowed to edit the course?
        case Some(_) =>
          if (user canEdit course.get) // Yes. Is it a course document
            courseFilter(resource) || (globalFilter(resource) && enabled(resource, ""))
          else // No. Allow it if the user can edit the content and it's global (owner or admin)
            globalFilter(resource) && (content isEditableBy user)
        // No. Allow it if the user can edit the content and it's global (owner or admin)
        case None =>
          globalFilter(resource) && (content isEditableBy user)
      }
    }
  }

  /**
   * Checks if the user is allowed to edit this particular resource
   */
  def canEdit(resource: JsObject): Boolean = {
    // Is it a personal document?
    personalFilter(resource) || {
      // Is the document global
      if (globalFilter(resource)) // Yes. Allow it if the user is owner
        content isEditableBy user
      else { // No. Are we in the context of a course
        course match {
          // Yes. Allow it if the user is a teacher and the doc is a course doc
          case Some(_) => courseFilter(resource) && (user canEdit course.get)
          // No. Then don't allow it
          case None => false
        }
      }
    }
  }

  /**
   * Checks if the user is allowed to publish this particular resource
   */
  def canPublish(resource: JsObject): Boolean = {
    (content isEditableBy user) && // Only owners/admins can publish
    ((resource \ "clientUser" \ "id") match { // Only allow resources which have been submitted
      case id: JsString => id.value.endsWith("request")
      case _ => false
    })
  }

  //TODO: update the content database so that this doesn't have to make resource requests
  def getSpecified(ids: List[String]): Future[List[JsObject]] = {
    val requests = ids.map { id => ResourceController.getResource(id) }
    future {
      requests.flatMap { req =>
        Await.result(req, Duration.Inf) match {
          case Some(json) => List((json \ "resource").as[JsObject])
          case None => Nil
        }
      }
    }
  }

  def checkViewable(ids: List[String]) = getSpecified(ids).map(_.filter(canView))
  def checkEnableable(ids: List[String]) = getSpecified(ids).map(_.filter(canEnable))
  def checkEditable(ids: List[String]) = getSpecified(ids).map(_.filter(canEdit))
  def checkPublishable(ids: List[String]) = getSpecified(ids).map(_.filter(canPublish))

}

object DocumentPermissionChecker {
  object documentTypes {
    val captionTrack = DocumentType("CaptionTracks", r => (r \ "type").as[String] == "transcript_of", "subjectId")
    val annotations = DocumentType("AnnotationDocuments", r => (r \ "type").as[String] == "references", "subjectId")
  }
}

case class DocumentType(name: String, filter: JsObject => Boolean, relation: String)