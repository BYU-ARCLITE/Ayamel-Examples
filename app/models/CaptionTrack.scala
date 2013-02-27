package models

import anorm.{~, Pk}
import sqlTraits.{SQLSelectable, SQLDeletable, SQLSavable}
import anorm.SqlParser._
import scala.Some
import play.api.libs.json.Json

/**
 * Created with IntelliJ IDEA.
 * User: camman3d
 * Date: 2/20/13
 * Time: 1:35 PM
 * To change this template use File | Settings | File Templates.
 */
case class CaptionTrack(id: Pk[Long], name: String, language: String, resourceId: String, content: String)
  extends SQLSavable with SQLDeletable {

  def save: CaptionTrack = {
    if (id.isDefined) {
      update(CaptionTrack.tableName, 'id -> id, 'name -> name, 'lang -> language, 'resourceId -> resourceId, 'content -> content)
      this
    } else {
      val id = insert(CaptionTrack.tableName, 'name -> name, 'lang -> language, 'resourceId -> resourceId, 'content -> content)
      this.copy(id)
    }
  }

  def delete() {
    delete(CaptionTrack.tableName, id)
  }

  def toJson = Json.obj(
    "id" -> id.get,
    "name" -> name,
    "language" -> language,
    "resourceId" -> resourceId
  )
}

object CaptionTrack extends SQLSelectable[CaptionTrack] {
  val tableName = "captionTrack"

  val simple = {
    get[Pk[Long]](tableName+".id") ~
      get[String](tableName+".name") ~
      get[String](tableName+".lang") ~
      get[String](tableName+".resourceId") ~
      get[String](tableName+".content") map {
      case id~name~language~resourceId~content => CaptionTrack(id, name, language, resourceId, content)
    }
  }

  def findById(id: Long): Option[CaptionTrack] = findById(tableName, id, simple)

  def list: List[CaptionTrack] = list(tableName, simple)

}