package dataAccess.sqlTraits

import anorm._
import play.api.db.DB
import play.api.Logger
import play.api.Play.current

/**
 * A trait to add SQL find and list functionality. Find is based on the field 'id'
 * @tparam T The type of object to return.
 */
trait SQLSelectable[T] {
  def findById(tablename: String, id: Long, parser: RowParser[T]): Option[T] = {
    DB.withConnection { implicit connection =>
      try {
        SQL"select * from $tablename where id = {id}"
          .on('id -> id).as(parser.singleOpt)
      } catch {
        case e: Exception =>
          Logger.debug(s"Failed to find $id in $tablename")
          Logger.debug(e.getMessage())
          None
      }
    }
  }

  def list(tablename: String, parser: RowParser[T]): List[T] =
    DB.withConnection { implicit connection =>
      try {
        SQL"select * from $tablename".as(parser *)
      } catch {
        case e: Exception =>
          Logger.debug(s"Failed to list $tablename")
          Logger.debug(e.getMessage())
          List[T]()
      }
    }
}
