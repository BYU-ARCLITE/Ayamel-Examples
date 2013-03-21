package dataAccess.sqlTraits

import anorm.{Pk, SQL}
import play.api.db.DB
import play.api.Play.current

/**
 * A trait to add SQL delete functionality.
 */
trait SQLDeletable {
  def delete(tablename: String, id: Pk[Long]) {
    DB.withConnection {
      implicit connection =>
        SQL("delete from " + tablename + " where id = {id}").on('id -> id).execute()
    }
  }
}
