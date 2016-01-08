package models

import anorm._
import anorm.SqlParser._
import dataAccess.sqlTraits._
import play.api.Logger
import play.api.db.DB
import play.api.libs.json.Json
import play.api.Play.current

/**
 * Created with IntelliJ IDEA.
 * User: josh
 * Date: 7/5/13
 * Time: 1:56 PM
 * To change this template use File | Settings | File Templates.
 */
case class WordListEntry(id: Option[Long], word: String, srcLang: String, destLang: String, userId: Long) extends SQLSavable with SQLDeletable {

  /**
   * Saves the word list entry to the DB
   * @return The possibly modified word list entry
   */
  def save: WordListEntry = {
    if (id.isDefined) {
      update(WordListEntry.tableName, 'id -> id.get, 'word -> word, 'srcLang -> srcLang, 'destLang -> destLang, 'userId -> userId)
      this
    } else {
      val id = insert(WordListEntry.tableName, 'word -> word, 'srcLang -> srcLang, 'destLang -> destLang, 'userId -> userId)
      this.copy(id)
    }
  }

  /**
   * Deletes the word list entry from the DB
   */
  def delete() {
    delete(WordListEntry.tableName, id)
  }

}

object WordListEntry extends SQLSelectable[WordListEntry] {
  val tableName = "wordList"

  val simple = {
    get[Option[Long]](tableName + ".id") ~
      get[String](tableName + ".word") ~
      get[String](tableName + ".srcLang") ~
      get[String](tableName + ".destLang") ~
      get[Long](tableName + ".userId") map {
      case id ~ word ~ srcLang ~ destLang ~ userId => WordListEntry(id, word, srcLang, destLang, userId)
    }
  }

  /**
   * Finds a word list entry by the id
   * @param id The id of the membership
   * @return If a word list entry was found, then Some[WordListEntry], otherwise None
   */
  def findById(id: Long): Option[WordListEntry] = findById(tableName, id, simple)

  /**
   * Finds a word list entry by the user
   * @param user The user who took the question set
   * @return If a word list entry was found, then Some[WordListEntry], otherwise None
   */
  def listByUser(user: User): List[WordListEntry] =
    DB.withConnection { implicit connection =>
	  try {
        SQL"select * from $tableName where userId = {id}"
          .on('id -> user.id.get).as(simple *)
	  } catch {
        case e: Exception =>
          Logger.debug("Failed in WordList.scala / listByUser")
          Logger.debug(e.getMessage())
          List[WordListEntry]()
      }
    }

  /**
   * Lists all word list entrys
   * @return The list of word list entrys
   */
  def list: List[WordListEntry] = list(tableName, simple)
}