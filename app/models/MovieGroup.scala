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
case class MovieGroup(id: Pk[Long], name: String, movies: List[Movie])
  extends SQLSavable with SQLDeletable {

  def save: MovieGroup = {
    if (id.isDefined) {
      update(MovieGroup.tableName, 'id -> id, 'name -> name, 'movies -> movies.map(_.id.get).mkString(","))
      this
    } else {
      val id = insert(MovieGroup.tableName, 'name -> name, 'movies -> movies.map(_.id.get).mkString(","))
      this.copy(id)
    }
  }

  def delete() {
    delete(MovieGroup.tableName, id)
  }

  def toJson = Json.obj(
    "id" -> id.get,
    "name" -> name,
    "movies" -> movies.map(_.toJson)
  )
}

object MovieGroup extends SQLSelectable[MovieGroup] {
  val tableName = "movieGroup"

  val simple = {
    get[Pk[Long]](tableName+".id") ~
      get[String](tableName+".name") ~
      get[String](tableName+".movies") map {
      case id~name~movies =>
        MovieGroup(id, name, movies.split(",").map(id => Movie.findById(id.toLong).get).toList)
    }
  }

  def findById(id: Long): Option[MovieGroup] = findById(tableName, id, simple)

  def list: List[MovieGroup] = list(tableName, simple)
}