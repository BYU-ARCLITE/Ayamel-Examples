package models.sqlTraits

import anorm.{Pk, SQL}
import play.api.db.DB
import play.api.Play.current

/**
 * Created with IntelliJ IDEA.
 * User: camman3d
 * Date: 2/15/13
 * Time: 1:50 PM
 * To change this template use File | Settings | File Templates.
 */
trait SQLDeletable {
  def delete(tablename: String, id: Pk[Long]) {
    DB.withConnection {
      implicit connection =>
        SQL("delete from " + tablename + " where id = {id}").on('id -> id).execute()
    }
  }
}
