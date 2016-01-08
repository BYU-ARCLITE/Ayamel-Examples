package models

import anorm._
import anorm.SqlParser._
import dataAccess.sqlTraits.{SQLDeletable, SQLSavable, SQLSelectable}

/**
 * Created with IntelliJ IDEA.
 * User: camman3d
 * Date: 5/7/13
 * Time: 5:12 PM
 * To change this template use File | Settings | File Templates.
 */
case class HelpPage(id: Option[Long], title: String, contents: String, category: String) extends SQLSavable with SQLDeletable {

  /**
   * Saves the help page to the DB
   * @return The possibly updated help page
   */
  def save =
    if (id.isDefined) {
      update(HelpPage.tableName, 'id -> id.get, 'title -> title, 'contents -> contents, 'category -> category)
      this
    } else {
      val id = insert(HelpPage.tableName, 'title -> title, 'contents -> contents, 'category -> category)
      this.copy(id)
    }

  /**
   * Deletes the help page from the DB
   */
  def delete() {
    delete(HelpPage.tableName)
  }
  
}

object HelpPage extends SQLSelectable[HelpPage] {
  val tableName = "helpPage"

  val simple = {
    get[Option[Long]](tableName + ".id") ~
      get[String](tableName + ".title") ~
      get[String](tableName + ".contents") ~
      get[String](tableName + ".category") map {
      case id ~ title ~ contents ~ category =>
        HelpPage(id, title, contents, category)
    }
  }

  /**
   * Search the DB for a help page with the given id.
   * @param id The id of the help page.
   * @return If a help page was found, then Some[User], otherwise None
   */
  def findById(id: Long): Option[HelpPage] = findById(id, simple)

  /**
   * Gets all help pages in the DB
   * @return The list of help pages
   */
  def list: List[HelpPage] = list(simple)

}
