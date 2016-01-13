package dataAccess.sqlTraits

import anorm._
import java.sql.SQLException
import play.api.db.DB
import play.api.Logger
import play.api.Play.current

/**
 * A trait to add SQL find and list functionality. Find is based on the field 'id'
 * @tparam T The type of object to return.
 */
trait SQLSelectable[T] {
  val tableName: String

  def findById(id: Long, parser: RowParser[T]): Option[T] = {
    DB.withConnection { implicit connection =>
      try {
        SQL(s"select * from $tableName where id = {id} limit 1")
          .on('id -> id).as(parser.singleOpt)
      } catch {
        case e: SQLException =>
          Logger.debug(s"Failed to find $id in $tableName")
          Logger.debug(e.getMessage())
          None
      }
    }
  }

  def findByCol(col: String, value: ParameterValue, parser: RowParser[T]): Option[T] = {
    DB.withConnection { implicit connection =>
      try {
        SQL(s"select * from $tableName where $col = {value} limit 1")
          .on('value -> value).as(parser.singleOpt)
      } catch {
        case e: SQLException =>
          Logger.debug(s"Failed to find $col = $value in $tableName")
          Logger.debug(e.getMessage())
          None
      }
    }
  }

  def list(parser: RowParser[T]): List[T] =
    DB.withConnection { implicit connection =>
      try {
        SQL(s"select * from $tableName").as(parser *)
      } catch {
        case e: SQLException =>
          Logger.debug(s"Failed to list $tableName")
          Logger.debug(e.getMessage())
          List[T]()
      }
    }

  def listByCol(col: String, value: ParameterValue, parser: RowParser[T]): List[T] =
    DB.withConnection { implicit connection =>
      try {
        SQL(s"select * from $tableName where $col = {value}")
          .on('value -> value).as(parser *)
      } catch {
        case e: SQLException =>
          Logger.debug(s"Failed to list $tableName for $col = $value")
          Logger.debug(e.getMessage())
          List[T]()
      }
    }
}
