package models

import dataAccess.sqlTraits.{SQLSelectable, SQLDeletable, SQLSavable}
import anorm.{~, Pk}
import anorm.SqlParser._
import play.api.db.DB
import play.api.Play.current

/**
 * Created with IntelliJ IDEA.
 * User: camman3d
 * Date: 5/28/13
 * Time: 5:35 PM
 * To change this template use File | Settings | File Templates.
 */
case class Setting(id: Pk[Long], name: String, value: String) extends SQLSavable with SQLDeletable {

  /**
   * Saves the setting to the DB
   * @return The possibly modified setting
   */
  def save: Setting = {
    if (id.isDefined) {
      update(Setting.tableName, 'id -> id, 'name -> name, 'settingValue -> value)
      this
    } else {
      val id = insert(Setting.tableName, 'name -> name, 'settingValue -> value)
      this.copy(id)
    }
  }

  /**
   * Deletes the setting from the DB
   */
  def delete() {
    delete(Setting.tableName, id)
  }

}


object Setting extends SQLSelectable[Setting] {
  val tableName = "setting"

  val simple = {
    get[Pk[Long]](tableName + ".id") ~
      get[String](tableName + ".name") ~
      get[String](tableName + ".settingValue") map {
      case id~name~value => Setting(id, name, value)
    }
  }

  /**
   * Finds a setting by the id
   * @param id The id of the setting
   * @return If a setting was found, then Some[Setting], otherwise None
   */
  def findById(id: Long): Option[Setting] = findById(tableName, id, simple)

  /**
   * Finds a setting by the name
   * @param name The name of the setting
   * @return If a setting was found, then Some[Setting], otherwise None
   */
  def findByName(name: String): Option[Setting] = {
    DB.withConnection {
      implicit connection =>
        anorm.SQL("select * from " + tableName + " where name = {name}").on('name -> name).as(simple.singleOpt)
    }
  }

  /**
   * Lists all settings
   * @return The list of settings
   */
  def list: List[Setting] = list(tableName, simple)
}
