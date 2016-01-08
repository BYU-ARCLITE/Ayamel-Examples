package dataAccess.sqlTraits

import anorm._
import java.sql.SQLException
import play.api.db.DB
import play.api.Logger
import play.api.Play.current

/**
 * A trait to add SQL insert and update functionality based on the field 'id'.
 */
trait SQLSavable {
  val id: Option[Long]

  def insert(tableName: String, fields: (Symbol, ParameterValue) *): Option[Long] = {
    val fieldNames = fields.map(_._1.name).mkString(", ")
    val fieldValues = fields.map("{" + _._1.name + "}").mkString(", ")

    DB.withConnection { implicit connection =>
      try {
        SQL(s"insert into $tableName ("+fieldNames+") values ("+fieldValues+")")
          .on(fields.map(t => NamedParameter.symbol(t)): _*)
          .executeInsert()
      } catch {
        case e: SQLException =>
          Logger.debug(s"Failed to save to $tableName")
          Logger.debug(e.getMessage())
          throw e
      }
    }
  }

  def update(tableName: String, fields: (Symbol, ParameterValue) *) {
    val fieldEntries = fields.map(_._1.name)
	    .filterNot(_ == "id")
        .map(n => s"$n = {$n}")
		.mkString(", ")

    DB.withConnection { implicit connection =>
      try {
        SQL(s"update $tableName set "+fieldEntries+" where id = {id}")
          .on('id -> id)
		  .on(fields.map(t => NamedParameter.symbol(t)):_*)
          .executeUpdate()
      } catch {
        case e: SQLException =>
          Logger.debug(s"Failed to update $tableName")
          Logger.debug(e.getMessage())
          throw e
      }
    }
  }
}
