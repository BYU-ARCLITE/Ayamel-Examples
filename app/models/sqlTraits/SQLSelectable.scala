package models.sqlTraits

import play.api.db.DB
import play.api.Play.current
import anorm.RowParser

/**
 * Created with IntelliJ IDEA.
 * User: camman3d
 * Date: 2/15/13
 * Time: 1:40 PM
 * To change this template use File | Settings | File Templates.
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
