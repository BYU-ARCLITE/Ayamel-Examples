package service

import models.{Course, User, Content}
import play.api.mvc.{Result, RequestHeader}
import dataAccess.ResourceController
import scala.concurrent.{ExecutionContext, Future}
import ExecutionContext.Implicits.global
import play.api.libs.json.{Json, JsObject, JsArray}

/**
 * This utility assists with adding resources as annotation or caption track documents to other resources
 */
object AdditionalDocumentAdder {


  def add(content: Content, resourceId: String, docType: Symbol, attributes: JsObject)
    (action: Option[Course] => Result)
	(implicit request: RequestHeader, user: User): Future[Result] = {

    val course = getCourse

    // Set the setting on the content
    content.addSetting(getSettingName(docType), List(resourceId))

    // Set the attributes on the resource
    ResourceHelper.setClientUser(resourceId, getClientUser(course, content)).flatMap { _ =>

      // Create the relation
      val relation = Json.obj(
        "subjectId" -> resourceId,
        "objectId" -> content.resourceId,
        "type" -> getRelationType(docType),
        "attributes" -> attributes
      )

      ResourceController.addRelation(relation)
    }.map { _ => action(course) }
  }

  def edit(content: Content, resourceId: String, docType: Symbol, attributes: JsObject)(action: Option[Course] => Result)(implicit request: RequestHeader, user: User): Future[Result] = {
    // find & delete
    // Get the list of relations this resource is in and delete them
    for(json <- ResourceController.getRelations(resourceId);
        relation <- ((json \ "relations").as[JsArray].value)
        if (relation \ "type").as[String] == getRelationType(docType)
        if (relation \ "objectId").as[String] == content.resourceId
    ) {
      ResourceController.deleteRelation((relation \ "id").as[String])
    }
    add(content, resourceId, docType, attributes)(action);
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
