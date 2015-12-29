package models

import anorm._
import anorm.SqlParser._
import dataAccess.sqlTraits.{SQLSelectable, SQLDeletable, SQLSavable}
import play.api.db.DB

/**
 * Created with IntelliJ IDEA.
 * User: camman3d
 * Date: 4/24/13
 * Time: 3:26 PM
 * To change this template use File | Settings | File Templates.
 */
case class HomePageContent(id: Option[Long], title: String, text: String, link: String, linkText: String,
                           background: String, active: Boolean) extends SQLSavable with SQLDeletable {

  /**
   * Saves the home page content to the DB
   * @return The possibly modified home page content
   */
  def save: HomePageContent = {
    if (id.isDefined) {
      update(HomePageContent.tableName, 'id -> id.get, 'title -> title, 'text -> text, 'link -> link, 'linkText -> linkText,
        'background -> background, 'active -> active)
      this
    } else {
      val id = insert(HomePageContent.tableName, 'title -> title, 'text -> text, 'link -> link, 'linkText -> linkText,
        'background -> background, 'active -> active)
      this.copy(id)
    }
  }

  /**
   * Deletes the home page content from the DB
   */
  def delete() {
    delete(HomePageContent.tableName, id)
  }

}


object HomePageContent extends SQLSelectable[HomePageContent] {
  val tableName = "homePageContent"

  val simple = {
    get[Option[Long]](tableName + ".id") ~
      get[String](tableName + ".title") ~
      get[String](tableName + ".text") ~
      get[String](tableName + ".link") ~
      get[String](tableName + ".linkText") ~
      get[String](tableName + ".background") ~
      get[Boolean](tableName + ".active") map {
      case id~title~text~link~linkText~background~active => HomePageContent(id, title, text, link, linkText, background, active)
    }
  }

  /**
   * Finds a home page content by the id
   * @param id The id of the membership
   * @return If a home page content was found, then Some[HomePageContent], otherwise None
   */
  def findById(id: Long): Option[HomePageContent] = findById(tableName, id, simple)


  /**
   * Lists all home page contents
   * @return The list of home page contents
   */
  def list: List[HomePageContent] = list(tableName, simple)
}