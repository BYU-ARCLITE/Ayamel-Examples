package models

import anorm.{~, Pk}
import sqlTraits.{SQLDeletable, SQLSelectable, SQLSavable}
import anorm.SqlParser._
import play.api.db.DB
import play.api.Play.current

/**
 * Created with IntelliJ IDEA.
 * User: camman3d
 * Date: 2/15/13
 * Time: 1:01 PM
 * To change this template use File | Settings | File Templates.
 */
case class User(id: Pk[Long], authId: String, authScheme: Symbol, username: String, name: Option[String] = None,
                email: Option[String] = None) extends SQLSavable with SQLDeletable {

  def save: User = {
    if (id.isDefined) {
      update("userAccount", 'id -> id, 'authId -> authId, 'authScheme -> authScheme.name, 'username -> username,
        'name -> name.getOrElse(""), 'email -> email.getOrElse(""))
      this
    } else {
      val id = insert("userAccount", 'authId -> authId, 'authScheme -> authScheme.name, 'username -> username,
        'name -> name.getOrElse(""), 'email -> email.getOrElse(""))
      this.copy(id)
    }
  }

  def delete() {
    delete("userAccount", id)
  }
}

object User extends SQLSelectable[User] {
  val simple = {
    get[Pk[Long]]("userAccount.id") ~
      get[String]("userAccount.authId") ~
      get[String]("userAccount.authScheme") ~
      get[String]("userAccount.username") ~
      get[String]("userAccount.name") ~
      get[String]("userAccount.email") map {
      case id~authId~authScheme~username~name~email => User(id, authId, Symbol(authScheme), username,
        if(name.isEmpty) None else Some(name), if(email.isEmpty) None else Some(email))
    }
  }

  def findById(id: Long): Option[User] = findById("userAccount", id, simple)

  def findByAuthInfo(authId: String, authScheme: Symbol): Option[User] = {
    DB.withConnection {
      implicit connection =>
        anorm.SQL("select * from userAccount where authId = {authId} and authScheme = {authScheme}")
          .on('authId -> authId, 'authScheme -> authScheme.name).as(simple.singleOpt)
    }
  }

  def list: List[User] = list("userAccount", simple)
}