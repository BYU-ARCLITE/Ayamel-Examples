package models

import anorm.{NotAssigned, ~, Pk}
import dataAccess.sqlTraits.{SQLSelectable, SQLDeletable, SQLSavable}
import anorm.SqlParser._
import service.{HashTools, SerializationTools, TimeTools}
import play.api.db.DB
import play.api.Play.current
import play.api.libs.json.{Json, JsValue}
import play.api.Logger
import concurrent.Future
import dataAccess.ResourceController
import java.text.Normalizer

/**
 * This links a resource object (in a resource library) to this system
 * @param id The id of this link in the DB
 * @param resourceId The id of the resource
 */
case class Content(id: Pk[Long], name: String, contentType: Symbol, thumbnail: String, resourceId: String,
                   dateAdded: String = TimeTools.now(),
                   visibility: Int = Content.visibility.tightlyRestricted,
                   shareability: Int = Content.shareability.shareable,
                   authKey: String = HashTools.md5Hex(util.Random.nextString(16)), labels: List[String] = Nil)
  extends SQLSavable with SQLDeletable {

  /**
   * Saves this content link to the DB
   * @return The optionally updated content
   */
  def save: Content = {
    if (id.isDefined) {
      update(Content.tableName, 'id -> id, 'name -> normalize(name), 'contentType -> contentType.name, 'thumbnail -> thumbnail,
        'resourceId -> resourceId, 'dateAdded -> dateAdded, 'visibility -> visibility, 'shareability -> shareability,
        'authKey -> authKey, 'labels -> normalize(labels.mkString(",")))
      this
    } else {
      val id = insert(Content.tableName, 'name -> normalize(name), 'contentType -> contentType.name, 'thumbnail -> thumbnail,
        'resourceId -> resourceId, 'dateAdded -> dateAdded, 'visibility -> visibility, 'shareability -> shareability,
        'authKey -> authKey, 'labels -> normalize(labels.mkString(",")))
      this.copy(id)
    }
  }

  /**
   * Deletes the content from the DB, but not from the resource library
   */
  def delete() {
    // Delete the content from courses
    ContentListing.listByContent(this).foreach(_.delete())

    // Delete ownership
    ContentOwnership.findByContent(this).delete()

    // Delete the content
    delete(Content.tableName, id)
  }

  //                  _   _
  //        /\       | | (_)
  //       /  \   ___| |_ _  ___  _ __  ___
  //      / /\ \ / __| __| |/ _ \| '_ \/ __|
  //     / ____ \ (__| |_| | (_) | | | \__ \
  //    /_/    \_\___|\__|_|\___/|_| |_|___/
  //
  //   ______ ______ ______ ______ ______ ______ ______ ______ ______
  // |______|______|______|______|______|______|______|______|______|
  //

  def setSetting(setting: String, argument: Seq[String]): Content = {
    Content.setSetting(this, setting, argument)
    this
  }

  def addSetting(setting: String, argument: Seq[String]): Content = {
    Content.addSetting(this, setting, argument)
    this
  }

  def removeSetting(setting: String, argument: Seq[String]): Content = {
    Content.removeSetting(this, setting, argument)
    this
  }

  // Recognize and fix certain diacritics that can cause issues in sql
  def normalize(str: String) = {
    Normalizer.normalize(str, Normalizer.Form.NFC)
  }

  //       _____      _   _
  //      / ____|    | | | |
  //     | |  __  ___| |_| |_ ___ _ __ ___
  //     | | |_ |/ _ \ __| __/ _ \ '__/ __|
  //     | |__| |  __/ |_| ||  __/ |  \__ \
  //      \_____|\___|\__|\__\___|_|  |___/
  //
  //   ______ ______ ______ ______ ______ ______ ______ ______ ______
  // |______|______|______|______|______|______|______|______|______|
  //

  /**
   * Visibility has four levels:
   * 1. Private - Only the owner can see this.
   * 2. Tightly Restricted - The owner and course members can see this.
   * 3. Loosely Restricted - The owner, teachers, and course members can see this.
   * 4. Public - Everybody can see this.
   * @param user The user to be checked
   * @return Visible or not
   */
  def isVisibleBy(user: User): Boolean = {
    // Always true if the user is an admin or the owner
    if (user.hasSitePermission("admin") || user.getContent.contains(this))
      true
    else
      // Check the visibility attribute of the content object
      visibility match {
        //super inefficient; at some point, we should re-vamp the storage of content->course membership
        case Content.visibility.tightlyRestricted => user.getEnrollment.flatMap(_.getContent).contains(this)
        case Content.visibility.looselyRestricted => user.hasSitePermission("viewRestricted") || user.getEnrollment.flatMap(_.getContent).contains(this)
        case Content.visibility.public => true
        case _ => false
      }
  }

  /**
   * Shareability has three levels:
   * 1. Not sharable
   * 2. Sharable by me only.
   * 3. Sharable by anybody who can see this.
   * @param user The user to be checked
   * @return Shareable or not
   */
  def isShareableBy(user: User): Boolean = {
    shareability match {
      case Content.shareability.notShareable => false
      case Content.shareability.byMeOnly => user.getContent.contains(this)
      case Content.shareability.shareable => isVisibleBy(user)
    }
  }

  /**
   * Checks if the user is authorized to edit this content. Owners and admins can edit.
   * @param user The user to check
   * @return Can edit or not
   */
  def isEditableBy(user: User): Boolean =
    user.hasSitePermission("admin") || user.getContent.contains(this)

  def getSetting(setting: String) = Content.getSetting(this, setting)
  
  //for backwards compatibility
  def settings(setting: String) = Content.getSetting(this, setting).mkString(",")

  def enabledCaptionTracks = getSetting("captionTrack")

  def enabledAnnotationDocuments = getSetting("annotationDocument")

  def showTranscripts: String = getSetting("showTranscripts").lift(0).getOrElse("false")

  def embedClass: String =
    if (contentType == 'audio || contentType == 'video)
      contentType.name + {if (showTranscripts == "true") 2 else 1}
    else
      "generic"

  def toJson = Json.obj(
    "id" -> id.get,
    "name" -> name,
    "contentType" -> contentType.name,
    "thumbnail" -> thumbnail,
    "resourceId" -> resourceId,
    "dateAdded" -> dateAdded,
    "visibility" -> visibility,
    "shareability" -> shareability,
    "settings" -> Content.getSettingMap(this).mapValues(_.mkString(",")),
    "authKey" -> authKey,
    "views" -> views("").size,
    "labels" -> labels
  )

  val cacheTarget = this
  object cache {
    var activity: Option[List[Activity]] = None
    var owner: Option[User] = None
    var scorings: Option[List[Scoring]] = None

    def getActivity: List[Activity] = {
      if (activity.isEmpty)
        activity = Some(Activity.listByPage("content", "view", id.get))
      activity.get
    }

    def getOwner: Option[User] = {
      if (owner.isEmpty)
        owner = User.findById(ContentOwnership.findByContent(cacheTarget).userId)
      owner
    }

    def getScorings: List[Scoring] = {
      if (scorings.isEmpty)
        scorings = Some(Scoring.listByContent(cacheTarget))
      scorings.get
    }
  }

  def getOwner = cache.getOwner

  def getScorings = cache.getScorings

  def getActivity(coursePrefix: String) = cache.getActivity.filter(_.activityContext.pageContext.action.startsWith(coursePrefix))

  def views(coursePrefix: String) = getActivity(coursePrefix).filter(_.verb == "pageload")

  def translations(coursePrefix: String) = getActivity(coursePrefix).filter(_.verb == "translate")

  def annotations(coursePrefix: String) = getActivity(coursePrefix).filter(_.verb == "view annotation")

  def cueClicks(coursePrefix: String) = getActivity(coursePrefix).filter(_.verb == "cueClick")
}

object Content extends SQLSelectable[Content] {
  val tableName = "content"
  val settingTable = "contentSetting"

  /* Visibility levels */
  object visibility {
    val _private = 1
    val tightlyRestricted = 2
    val looselyRestricted = 3
    val public = 4
  }

  /* Shareability levels */
  object shareability {
    val notShareable = 1
    val byMeOnly = 2
    val shareable = 3
  }

  val simple = {
    get[Pk[Long]](tableName + ".id") ~
      get[String](tableName + ".name") ~
      get[String](tableName + ".contentType") ~
      get[String](tableName + ".thumbnail") ~
      get[String](tableName + ".resourceId") ~
      get[String](tableName + ".dateAdded") ~
      get[Int](tableName + ".visibility") ~
      get[Int](tableName + ".shareability") ~
      get[String](tableName + ".authKey") ~
      get[String](tableName + ".labels") map {
      case id ~ name ~ contentType ~ thumbnail ~ resourceId ~ dateAdded ~ visibility ~ shareability ~ authKey ~ labels =>
        Content(id, name, Symbol(contentType), thumbnail, resourceId, dateAdded, visibility, shareability,
          authKey, labels.split(",").toList.filterNot(_.isEmpty))
    }
  }

  /**
   * Finds a content by the given id
   * @param id The id of the content link
   * @return If a content link was found, then Some[Content], otherwise None
   */
  def findById(id: Long): Option[Content] = findById(tableName, id, simple)

  /**
   * Gets all the content in the DB
   * @return The list of content
   */
  def list: List[Content] = list(tableName, simple)

  /**
   * Gets all the public content sorted by newest first
   * @return The list of content
   */
  def listPublic: List[Content] = list.filter(_.visibility == Content.visibility.public)
    .sortWith((c1, c2) => TimeTools.dateToTimestamp(c1.dateAdded) > TimeTools.dateToTimestamp(c2.dateAdded))

  /**
   * Create a content from fixture data
   * @param data Fixture data
   * @return The content
   */
  def fromFixture(data: (String, Symbol, String, String)): Content =
    Content(NotAssigned, data._1, data._2, data._3, data._4)

  /**
   * Search the names of content
   * @param query The string to look for
   * @return The list of content that match
   */
  def search(query: String): List[Content] =
    DB.withConnection {
      implicit connection =>
        val sqlQuery = "%" + query + "%"
        // TODO: Search the resource library metadata. Issue # 51
        anorm.SQL("SELECT * from " + tableName + " where name like {query} and visibility = {public}")
          .on('query -> sqlQuery, 'public -> visibility.public).as(simple *)
    }

  def setSetting(content: Content, setting: String, argument: Seq[String]) =
    DB.withConnection {
      implicit connection =>
        anorm.SQL("DELETE from " +  settingTable + " where contentId = {cid} and setting = {setting}")
          .on('cid -> content.id, 'setting -> setting).execute()
        argument.foreach { arg =>
          anorm.SQL("INSERT into " +  settingTable + " (contentId, setting, argument) values ({cid}, {setting}, {argument})")
          .on('cid -> content.id, 'setting -> setting, 'argument -> arg).execute()
        }
    }

  def addSetting(content: Content, setting: String, argument: Seq[String]) =
    DB.withConnection {
      implicit connection =>
        argument.foreach { arg =>
          anorm.SQL("INSERT into " +  settingTable + " (contentId, setting, argument) values ({cid}, {setting}, {argument})")
          .on('cid -> content.id, 'setting -> setting, 'argument -> arg).execute()
        }
    }

  def removeSetting(content: Content, setting: String, argument: Seq[String]) =
    DB.withConnection {
      implicit connection =>
        argument.foreach { arg =>
          anorm.SQL("DELETE from " +  settingTable + " where contentId = {cid} and setting = {setting} and argument = {argument}")
          .on('cid -> content.id, 'setting -> setting, 'argument -> arg).execute()
        }
    }

  def getSetting(content: Content, setting: String): List[String] =
    DB.withConnection {
      implicit connection =>
        anorm.SQL("SELECT argument from " +  settingTable + " where contentId = {cid} and setting = {setting}")
          .on('cid -> content.id, 'setting -> setting).as(get[String](settingTable + ".argument") *)
    }

  def getSettingMap(content: Content): Map[String, List[String]] =
    DB.withConnection {
      implicit connection =>
        val plist: List[(String, String)] = anorm.SQL("SELECT setting, argument from " +  settingTable + " where contentId = {cid}")
          .on('cid -> content.id).as(
            get[String](settingTable + ".setting") ~
            get[String](settingTable + ".argument") map {
            case setting ~ argument => setting -> argument
          } *)
        (Map[String, List[String]]() /: plist) { (acc, next) =>
          next match {
            case (setting, argument) =>
              if(acc.contains(setting)) acc + (setting -> (argument :: acc(setting)))
              else acc + (setting -> List(argument))
          }
        }
    }
}