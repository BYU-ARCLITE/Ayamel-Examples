package dataAccess.sqlTraits

import anorm._
import play.api.db.DB
import play.api.Play.current

/**
 * A trait to add SQL delete functionality.
 */
trait SQLDeletable {
  def delete(tablename: String, id: Option[Long]) {
    if (!id.isDefined) { return }
    DB.withConnection {
      implicit connection =>
        SQL(s"delete from $tablename where id = ${id.get}")
          .execute()
    }
  }
}
