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
    val prefix = getPrefix(content, course)

    // Set the setting on the content
    val settingName = getSettingName(docType, prefix)
    val enabledDocuments = content.settings.get(settingName).map(_.split(",").filterNot(_.isEmpty).toList).getOrElse(Nil)
    content.setSetting(settingName, (resourceId :: enabledDocuments).mkString(",")).save

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

  private def getRelationType(docType: Symbol): String = {
    if (docType == 'captionTrack)
      "transcript_of"
    else if (docType == 'annotations)
      "references"
    else
      "unknown"
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

  private def getSettingName(docType: Symbol, prefix: String): String = {
    if (docType == 'captionTrack)
      prefix + "enabledCaptionTracks"
    else if (docType == 'annotations)
      prefix + "enabledAnnotationDocuments"
    else
      "unknown"
  }

  private def getPrefix(content: Content, course: Option[Course])(implicit user: User): String = {
    if (course.isDefined)
      "course_" + course.get.id.get + ":"
    else if (content.isEditableBy(user))
      ""
    else
      "user_" + user.id.get + ":"
  }

  def getCourse()(implicit request: RequestHeader): Option[Course] =
    request.queryString.get("course").flatMap(id => Course.findById(id(0).toLong))

}
