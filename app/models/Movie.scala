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
case class Movie(id: Pk[Long], name: String, description: String, resourceId: String, captionTracks: List[CaptionTrack])
  extends SQLSavable with SQLDeletable {

  def save: Movie = {
    if (id.isDefined) {
      update(Movie.tableName, 'id -> id, 'name -> name, 'description -> description, 'resourceId -> resourceId, 'captionTracks -> captionTracks.map(_.id.get).mkString(","))
      this
    } else {
      val id = insert(Movie.tableName, 'name -> name, 'description -> description, 'resourceId -> resourceId, 'captionTracks -> captionTracks.map(_.id.get).mkString(","))
      this.copy(id)
    }
  }

  def delete() {
    delete(Movie.tableName, id)
  }

  def toJson = Json.obj(
    "id" -> id.get,
    "name" -> name,
    "description" -> description,
    "resourceId" -> resourceId,
    "captionTracks" -> captionTracks.map(_.toJson)
  )
}

object Movie extends SQLSelectable[Movie] {
  val tableName = "movie"

  val simple = {
    get[Pk[Long]](tableName+".id") ~
      get[String](tableName+".name") ~
      get[String](tableName+".description") ~
      get[String](tableName+".resourceId") ~
      get[String](tableName+".captionTracks") map {
      case id~name~description~resourceId~captionTracks =>
        Movie(id, name, description, resourceId, captionTracks.split(",").filterNot(_.isEmpty)
          .map(id => CaptionTrack.findById(id.toLong).get).toList)
    }
  }

  def findById(id: Long): Option[Movie] = findById(tableName, id, simple)

  def findByName(name: String): Option[Movie] = DB.withConnection {
    implicit connection =>
      anorm.SQL("select * from " + tableName + " where name = {name}").on('name -> name).as(simple.singleOpt)
  }

  def list: List[Movie] = list(tableName, simple)
}