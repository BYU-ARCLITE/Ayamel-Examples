package dataAccess.sqlTraits

import play.api.db.DB
import play.api.Play.current
import anorm.RowParser

/**
 * A trait to add SQL find and list functionality. Find is based on the field 'id'
 * @tparam T The type of object to return.
 */
trait SQLSelectable[T] {
  def findById(tablename: String, id: Long, parser: RowParser[T]): Option[T] = {
    DB.withConnection {
      implicit connection =>
        anorm.SQL("select * from " + tablename + " where id = {id}").on('id -> id).as(parser.singleOpt)
    }
  }

  def list(tablename: String, parser: RowParser[T]): List[T] = {
    DB.withConnection {
      implicit connection =>
        anorm.SQL("select * from " + tablename).as(parser *)
    }
  }
}
