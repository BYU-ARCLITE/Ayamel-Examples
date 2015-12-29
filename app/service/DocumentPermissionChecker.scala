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
 *  - Can enable
 *  - Can edit
 *  Some of this is inefficient and some of it is close-to-vacuous, so some re-architecting may be in order here.
 */
class DocumentPermissionChecker(user: User, content: Content, course: Option[Course], documentType: String) {

  // A document resource is personal if clientUser.id = user.id
  def personalFilter(resource: JsObject): Boolean = try {
    // At the moment, the clientId is not setup for all caption tracks.
    // So if clientUser does not exist yet, use content.isEditableBy
    val id = (resource \ "clientUser" \ "id").asOpt[String].getOrElse("")
    (if (id.startsWith("user:")) {
	  id.split(":")(1)
	} else { id }).toLong == user.id.get
  } catch {
    // handles unchecked gets & numeric conversion errors
    case _: Throwable => false
  }

  def enabled(resource: JsObject): Boolean = {
    val id = (resource \ "id").as[String]
    content.getSetting(documentType).contains(id)
  }

  /**
   * Checks if the user is allowed to view this particular resource
   */
  def canView(resource: JsObject): Boolean = {
    enabled(resource)
  }

  /**
   * Checks if the user is allowed to enable this particular resource
   */
  def canEnable(resource: JsObject): Boolean = {
    content.isEditableBy(user)
  }

  /**
   * Checks if the user is allowed to edit this particular resource
   */
  def canEdit(resource: JsObject): Boolean = {
    (personalFilter(resource) || user.hasSitePermission("admin")) //or user is admin
  }

  //TODO: update the content database so that this doesn't have to make resource requests
  def getSpecified(ids: List[String]): Future[List[JsObject]] = {
    val requests = ids.map { id => ResourceController.getResource(id) }
    Future {
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

}