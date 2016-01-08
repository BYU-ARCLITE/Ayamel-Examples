package dataAccess.sqlTraits

import anorm._
import java.sql.SQLException
import play.api.db.DB
import play.api.Logger
import play.api.Play.current

/**
 * A trait to add SQL delete functionality.
 */
trait SQLDeletable {
  val id: Option[Long]

  def delete(tableName: String) {
    if (!id.isDefined) { return }
    DB.withConnection { implicit connection =>
      try {
        SQL(s"delete from $tableName where id = {id}")
          .on('id -> id.get).execute()
      } catch {
        case e: SQLException =>
          Logger.debug(s"Failed to delete ${id.get} from $tableName")
          Logger.debug(e.getMessage())
      }
    }
  }
}
