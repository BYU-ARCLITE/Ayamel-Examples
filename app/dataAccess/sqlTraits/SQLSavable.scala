package dataAccess.sqlTraits

import anorm._
import play.api.db.DB
import play.api.Logger
import play.api.Play.current

/**
 * A trait to add SQL insert and update functionality based on the field 'id'.
 */
trait SQLSavable {
  def insert(tablename: String, fields: (Symbol, ParameterValue) *): Option[Long] = {
    val fieldNames = fields.map(_._1.name).mkString(", ")
    val fieldValues = fields.map("{" + _._1.name + "}").mkString(", ")

    DB.withConnection { implicit connection =>
      try {
        val query = SQL"insert into $tablename ($fieldNames) values ($fieldValues)"
        val id: Option[Long] = query
          .on(fields.map(t => NamedParameter.symbol(t)): _*)
          .executeInsert()
        Some(id.get)
      } catch {
        case e: Exception =>
          Logger.debug(s"Failed to save to $tablename")
          Logger.debug(e.getMessage())
          throw e
      }
    }
  }

  def update(tablename: String, fields: (Symbol, ParameterValue) *) {
    assert(fields.map(_._1.name).contains("id"))
    val fieldEntries = fields.map(_._1.name).filterNot(_ == "id").map(n => n + " = {" + n + "}").mkString(", ")

    DB.withConnection { implicit connection =>
      try {
        SQL"update $tablename set $fieldEntries where id = {id}"
          .on(fields.map(t => NamedParameter.symbol(t)): _*)
          .executeUpdate()
      } catch {
        case e: Exception =>
          Logger.debug(s"Failed to update $tablename")
          Logger.debug(e.getMessage())
          throw e
      }
    }
  }
}
