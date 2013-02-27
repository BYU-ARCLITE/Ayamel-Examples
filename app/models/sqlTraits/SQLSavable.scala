package models.sqlTraits

import anorm.{Id, ParameterValue, SQL, Pk}
import play.api.db.DB
import play.api.Play.current

trait SQLSavable {
  def insert(tablename: String, fields: (Symbol, ParameterValue[_]) *): Pk[Long] = {
    val fieldNames = fields.map(_._1.name).mkString(", ")
    val fieldValues = fields.map("{" + _._1.name + "}").mkString(", ")

    DB.withConnection {
      implicit connection =>
        val id: Option[Long] = SQL("insert into "+tablename+" ("+fieldNames+") values ("+fieldValues+")")
          .on(fields: _*).executeInsert()
        Id(id.get)
    }
  }

  def update(tablename: String, fields: (Symbol, ParameterValue[_]) *) {
    assert(fields.map(_._1.name).contains("id"))
    val fieldEntries = fields.map(_._1.name).filterNot(_ == "id").map(n => n + " = {" + n + "}").mkString(", ")

    DB.withConnection {
      implicit connection =>
        SQL("update "+tablename+" set "+fieldEntries+" where id = {id}").on(fields: _*).executeUpdate()
    }
  }
}
