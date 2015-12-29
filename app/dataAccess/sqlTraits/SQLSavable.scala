package dataAccess.sqlTraits

import anorm._
import play.api.db.DB
import play.api.Play.current

/**
 * A trait to add SQL insert and update functionality based on the field 'id'.
 */
trait SQLSavable {
  def insert(tablename: String, fields: (Symbol, ParameterValue) *): Option[Long] = {
    val fieldNames = fields.map(_._1.name).mkString(", ")
    val fieldValues = fields.map("{" + _._1.name + "}").mkString(", ")

    DB.withConnection {
      implicit connection =>
        val id: Option[Long] = SQL("insert into "+tablename+" ("+fieldNames+") values ("+fieldValues+")")
          .on(fields.map(t => NamedParameter.symbol(t)): _*).executeInsert()
        Some(id.get)
    }
  }

  def update(tablename: String, fields: (Symbol, ParameterValue) *) {
    assert(fields.map(_._1.name).contains("id"))
    val fieldEntries = fields.map(_._1.name).filterNot(_ == "id").map(n => n + " = {" + n + "}").mkString(", ")

    DB.withConnection {
      implicit connection =>
        SQL("update "+tablename+" set "+fieldEntries+" where id = {id}")
          .on(fields.map(t => NamedParameter.symbol(t)): _*).executeUpdate()
    }
  }
}
