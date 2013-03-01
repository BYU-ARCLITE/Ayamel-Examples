package models

import anorm.{~, Pk}
import sqlTraits.{SQLSelectable, SQLDeletable, SQLSavable}
import anorm.SqlParser._
import play.api.libs.json.Json

/**
 * Created with IntelliJ IDEA.
 * User: camman3d
 * Date: 2/20/13
 * Time: 1:29 PM
 * To change this template use File | Settings | File Templates.
 */
case class VideoGroup(id: Pk[Long], name: String, videos: List[Video])
  extends SQLSavable with SQLDeletable {

  def save: VideoGroup = {
    if (id.isDefined) {
      update(VideoGroup.tableName, 'id -> id, 'name -> name, 'videos -> videos.map(_.id.get).mkString(","))
      this
    } else {
      val id = insert(VideoGroup.tableName, 'name -> name, 'videos -> videos.map(_.id.get).mkString(","))
      this.copy(id)
    }
  }

  def delete() {
    delete(VideoGroup.tableName, id)
  }

  def toJson = Json.obj(
    "id" -> id.get,
    "name" -> name,
    "videos" -> videos.map(_.toJson)
  )
}

object VideoGroup extends SQLSelectable[VideoGroup] {
  val tableName = "videoGroup"

  val simple = {
    get[Pk[Long]](tableName+".id") ~
      get[String](tableName+".name") ~
      get[String](tableName+".videos") map {
      case id~name~videos =>
        VideoGroup(id, name, videos.split(",").map(id => Video.findById(id.toLong).get).toList)
    }
  }

  def findById(id: Long): Option[VideoGroup] = findById(tableName, id, simple)

  def list: List[VideoGroup] = list(tableName, simple)
}