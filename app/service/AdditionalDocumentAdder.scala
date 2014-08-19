package service

import models.{Course, User, Content}
import play.api.mvc.{Result, RequestHeader}
import dataAccess.ResourceController
import scala.concurrent.{ExecutionContext, Future}
import ExecutionContext.Implicits.global
import play.api.libs.json.Json

/**
 * This utility assists with adding resources as annotation or caption track documents to other resources
 */
object AdditionalDocumentAdder {


  def add(content: Content, resourceId: String, docType: Symbol)(action: Option[Course] => Result)(implicit request: RequestHeader, user: User): Future[Result] = {

    val course = getCourse

    // Set the setting on the content
    content.addSetting(getSettingName(docType), List(resourceId))

    // Set the attributes on the resource
//    ResourceHelper.setAttributes(resourceId, getClientUser(course, content)).flatMap(resource => {
    ResourceHelper.setClientUser(resourceId, getClientUser(course, content)).flatMap(resource => {

      // Create the relation
      val relation = Json.obj(
        "subjectId" -> resourceId,
        "objectId" -> content.resourceId,
        "type" -> getRelationType(docType)
      )
      ResourceController.addRelation(relation).map(r => {

        // Do something with the result
        action(course)
      })
    })
  }

  private def getRelationType(docType: Symbol): String =
    docType match {
	  case 'captionTrack => "transcript_of"
      case 'annotations => "references"
      case _ => "unknown"
    }

  private def getClientUser(course: Option[Course], content: Content)(implicit user: User): Map[String, String] = {
    if (course.isDefined)
      Map("id" -> ("course:" + course.get.id.get))
    else if (content isEditableBy user)
      Map()
    else
      Map("id" -> ("user:" + user.id.get))
  }

//  private def getRelationAttributes(docType: Symbol): Map[String, String] = {
//    if (docType == 'annotations)
//      Map("type" -> "annotations")
//    else
//      Map()
//  }

  private def getSettingName(docType: Symbol): String =
    docType match {
      case 'captionTrack => "captionTrack"
      case 'annotations => "annotationDocument"
      case _ => "unknown"
    }

  def getCourse()(implicit request: RequestHeader): Option[Course] =
    request.queryString.get("course").flatMap(id => Course.findById(id(0).toLong))

}
