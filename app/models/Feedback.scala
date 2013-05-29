package models

import dataAccess.sqlTraits.{SQLDeletable, SQLSelectable, SQLSavable}
import service.TimeTools
import anorm.{~, NotAssigned, Pk}
import anorm.SqlParser._

/**
 * Created with IntelliJ IDEA.
 * User: camman3d
 * Date: 5/28/13
 * Time: 5:35 PM
 * To change this template use File | Settings | File Templates.
 */
case class Feedback(id: Pk[Long], userId: Long, category: String, description: String, submitted: String = TimeTools.now())
  extends SQLSavable with SQLDeletable {

  def save = {
    insert(Feedback.tableName, 'userId -> userId, 'category -> category, 'description -> description,
      'submitted -> submitted)
    this
  }

  def delete() {
    delete(Feedback.tableName, id)
  }

  def getErrorInfo: (String, String) = {
    val pattern = "^Error Code: (.*), Description: (.*)$".r
    description match {
      case pattern(errorCode, errorDescription) => (errorCode, errorDescription)
      case _ => ("error", "error")
    }
  }

  def getProblemInfo: (String, String, String) = {
    val pattern = "^Problem: (.*), Reproduce: (.*), User Agent: (.*)$".r
    description match {
      case pattern(problem, reproduce, userAgent) => (problem, reproduce, userAgent)
      case _ => ("error", "error", "error")
    }
  }

  def getSuggestionInfo: String = {
    val pattern = "^Feature: (.*)$".r
    description match {
      case pattern(suggestion) => suggestion
      case _ => "error"
    }
  }

  def getThoughtInfo: (String, String, String, String) = {
    val pattern = "^Navigate: (.*), Find: (.*), Useful: (.*), Comments: (.*)$".r
    description match {
      case pattern(navigate, find, useful, comments) => (navigate, find, useful, comments)
      case _ => ("error", "error", "error", "error")
    }
  }


}

object Feedback extends SQLSelectable[Feedback] {
  val tableName = "feedback"

  val simple = {
    get[Pk[Long]](tableName + ".id") ~
      get[Long](tableName + ".userId") ~
      get[String](tableName + ".category") ~
      get[String](tableName + ".description") ~
      get[String](tableName + ".submitted") map {
      case id~userId~category~description~submitted => Feedback(id, userId, category, description, submitted)
    }
  }

  def findById(id: Long): Option[Feedback] = findById(tableName, id, simple)

  def save(user: User, category: String, description: String) =
    Feedback(NotAssigned, user.id.get, category, description).save

  def list: List[Feedback] = list(tableName, simple)
}
