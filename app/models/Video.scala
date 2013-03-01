package models

import anorm.{~, Pk}
import sqlTraits.{SQLSelectable, SQLDeletable, SQLSavable}
import anorm.SqlParser._
import play.api.db.DB
import play.api.Play.current
import play.api.libs.json.Json

/**
 * Created with IntelliJ IDEA.
 * User: camman3d
 * Date: 2/20/13
 * Time: 1:31 PM
 * To change this template use File | Settings | File Templates.
 */
case class Video(id: Pk[Long], name: String, description: String, resourceId: String, captionTracks: List[CaptionTrack])
  extends SQLSavable with SQLDeletable {

  def save: Video = {
    if (id.isDefined) {
      update(Video.tableName, 'id -> id, 'name -> name, 'description -> description, 'resourceId -> resourceId, 'captionTracks -> captionTracks.map(_.id.get).mkString(","))
      this
    } else {
      val id = insert(Video.tableName, 'name -> name, 'description -> description, 'resourceId -> resourceId, 'captionTracks -> captionTracks.map(_.id.get).mkString(","))
      this.copy(id)
    }
  }

  def delete() {
    delete(Video.tableName, id)
  }

  def toJson = Json.obj(
    "id" -> id.get,
    "name" -> name,
    "description" -> description,
    "resourceId" -> resourceId,
    "captionTracks" -> captionTracks.map(_.toJson)
  )
}

object Video extends SQLSelectable[Video] {
  val tableName = "video"

  val simple = {
    get[Pk[Long]](tableName+".id") ~
      get[String](tableName+".name") ~
      get[String](tableName+".description") ~
      get[String](tableName+".resourceId") ~
      get[String](tableName+".captionTracks") map {
      case id~name~description~resourceId~captionTracks =>
        Video(id, name, description, resourceId, captionTracks.split(",").filterNot(_.isEmpty)
          .map(id => CaptionTrack.findById(id.toLong).get).toList)
    }
  }

  def findById(id: Long): Option[Video] = findById(tableName, id, simple)

  def findByName(name: String): Option[Video] = DB.withConnection {
    implicit connection =>
      anorm.SQL("select * from " + tableName + " where name = {name}").on('name -> name).as(simple.singleOpt)
  }

  def list: List[Video] = list(tableName, simple)
}