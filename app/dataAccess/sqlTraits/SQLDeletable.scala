package dataAccess.sqlTraits

import anorm._
import play.api.db.DB
import play.api.Logger
import play.api.Play.current

/**
 * A trait to add SQL delete functionality.
 */
trait SQLDeletable {
  def delete(tablename: String, id: Option[Long]) {
    if (!id.isDefined) { return }
    DB.withConnection { implicit connection =>
      try {
        SQL"delete from $tablename where id = ${id.get}"
          .execute()
      } catch {
        case e: Exception =>
          Logger.debug(s"Failed to delete ${id.get} from $tablename")
          Logger.debug(e.getMessage())
      }
    }
  }
}
