package models

import anorm.{~, Pk}
import dataAccess.sqlTraits.{SQLDeletable, SQLSavable, SQLSelectable}
import anorm.SqlParser._
import service.TimeTools
import play.api.db.DB
import play.api.Play.current
import play.api.Logger

/**
 * The Activity model is based of the activity stream specification found here:
 * http://activitystrea.ms/
 *
 * However, it has been modified in order to be optimized for the application and database and to contain the entire
 * context of the action.
 *
 * @param id The id of the activity
 * @param actor The id of the user who did the activity
 * @param verb The verb the user did
 * @param activityContext An ActivityContext object describing the context wherein the user did the activity
 * @param activityObject If the activity involved an object, then this describes that object
 */
case class Activity(id: Pk[Long], actor: Long, verb: String, activityContext: ActivityContext,
                    activityObject: ActivityObject, published: String = TimeTools.now())
  extends SQLSavable with SQLDeletable {

  /**
   * Saves the activity to the DB
   * @return The possibly updated activity
   */
  def save: Activity = {
    if (id.isDefined) {
      update(Activity.tableName, 'id -> id,
        'actor -> actor,
        'verb -> verb,
        'pageCategory -> activityContext.pageContext.category,
        'pageAction -> activityContext.pageContext.action,
        'pageId -> activityContext.pageContext.id,
        'generatorType -> activityContext.generatorContext.objectType,
        'generatorId -> activityContext.generatorContext.id,
        'generatorItemRef -> activityContext.generatorContext.itemRef,
        'objectType -> activityObject.objectType,
        'objectId -> activityObject.id,
        'objectItemRef -> activityObject.itemRef,
        'published -> published)
      this
    } else {
      val id = insert(Activity.tableName,
        'actor -> actor,
        'verb -> verb,
        'pageCategory -> activityContext.pageContext.category,
        'pageAction -> activityContext.pageContext.action,
        'pageId -> activityContext.pageContext.id,
        'generatorType -> activityContext.generatorContext.objectType,
        'generatorId -> activityContext.generatorContext.id,
        'generatorItemRef -> activityContext.generatorContext.itemRef,
        'objectType -> activityObject.objectType,
        'objectId -> activityObject.id,
        'objectItemRef -> activityObject.itemRef,
        'published -> published)
      this.copy(id)
    }
  }

  /**
   * Deletes the activity from the DB
   */
  def delete() {
    delete(Activity.tableName, id)
  }

  object cache {
    var user: Option[User] = None

    def getUser = {
      if (user.isEmpty)
        user = User.findById(actor)
      user
    }
  }

  def getUser: Option[User] = cache.getUser

}

case class ActivityContext(pageContext: PageContext, generatorContext: ActivityObject)

case class PageContext(category: String, action: String, id: Long)

case class ActivityObject(objectType: String, id: String, itemRef: String)

object Activity extends SQLSelectable[Activity] {
  val tableName = "activity"

  val simple = {
    get[Pk[Long]](tableName + ".id") ~
      get[Long](tableName + ".actor") ~
      get[String](tableName + ".verb") ~
      get[String](tableName + ".pageCategory") ~
      get[String](tableName + ".pageAction") ~
      get[Long](tableName + ".pageId") ~
      get[String](tableName + ".generatorType") ~
      get[String](tableName + ".generatorId") ~
      get[String](tableName + ".generatorItemRef") ~
      get[String](tableName + ".objectType") ~
      get[String](tableName + ".objectId") ~
      get[String](tableName + ".objectItemRef") ~
      get[String](tableName + ".published") map {
      case id ~ actor ~ verb ~ pc ~ pa ~ pi ~ gt ~ gi ~ gir ~ ot ~ oi ~ oir ~ published => {
        val activityContext = ActivityContext(PageContext(pc, pa, pi), ActivityObject(gt, gi, gir))
        val activityObject = ActivityObject(ot, oi, oir)
        Activity(id, actor, verb, activityContext, activityObject, published)
      }
    }
  }

  /**
   * Search the DB for a activity with the given id.
   * @param id The id of the activity.
   * @return If a activity was found, then Some[Activity], otherwise None
   */
  def findById(id: Long): Option[Activity] = findById(Activity.tableName, id, simple)

  /**
   * Gets all activitys in the DB
   * @return The list of activitys
   */
  def list: List[Activity] = list(Activity.tableName, simple)

  /**
   * Gets all activitys in the DB
   * @return The list of activitys
   */
  def listByPage(category: String, action: String, id: Long): List[Activity] =
    DB.withConnection {
      implicit connection =>
        anorm.SQL("select * from " + tableName +
          " where pageCategory = {pageCategory} and pageAction like {pageAction} and pageId = {pageId}")
          .on('pageCategory -> category, 'pageAction -> ("%" + action), 'pageId -> id)
          .as(simple *)
    }
	
  /**
   * Lists a user's activities
   * @param user The user who executed the activity
   * @return The list of activities
   */
  def listByUser(user: User): List[Activity] =
    DB.withConnection {
      implicit connection =>
        anorm.SQL("select * from " + tableName + " where actor = {id}").on('id -> user.id).as(simple *)
    }
}