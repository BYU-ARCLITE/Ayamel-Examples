package models

import anorm.{~, Pk}
import dataAccess.sqlTraits.{SQLDeletable, SQLSavable, SQLSelectable}
import anorm.SqlParser._

/**
 * Created with IntelliJ IDEA.
 * User: camman3d
 * Date: 5/7/13
 * Time: 5:12 PM
 * To change this template use File | Settings | File Templates.
 */
case class HelpPage(id: Pk[Long], title: String, contents: String) extends SQLSavable with SQLDeletable {

  /**
   * Saves the help page to the DB
   * @return The possibly updated help page
   */
  def save: HelpPage = {
    if (id.isDefined) {
      update(HelpPage.tableName, 'id -> id, 'title -> title, 'contents -> contents)
      this
    } else {
      val id = insert(HelpPage.tableName, 'title -> title, 'contents -> contents)
      this.copy(id)
    }
  }

  /**
   * Deletes the help page from the DB
   */
  def delete() {
    delete(HelpPage.tableName, id)
  }
  
}

object HelpPage extends SQLSelectable[HelpPage] {
  val tableName = "helpPage"

  val simple = {
    get[Pk[Long]](tableName + ".id") ~
      get[String](tableName + ".title") ~
      get[String](tableName + ".contents") map {
      case id ~ title ~ contents => {
        HelpPage(id, title, contents)
      }
    }
  }

  /**
   * Search the DB for a help page with the given id.
   * @param id The id of the help page.
   * @return If a help page was found, then Some[User], otherwise None
   */
  def findById(id: Long): Option[HelpPage] = findById(HelpPage.tableName, id, simple)

  /**
   * Gets all help pages in the DB
   * @return The list of help pages
   */
  def list: List[HelpPage] = list(HelpPage.tableName, simple)

}
