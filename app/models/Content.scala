package models

import anorm._
import anorm.SqlParser._
import dataAccess.sqlTraits.{SQLSelectable, SQLDeletable, SQLSavable}
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
case class Content(id: Option[Long], name: String, contentType: Symbol, thumbnail: String, resourceId: String,
                   dateAdded: String = TimeTools.now(),
                   visibility: Int = Content.visibility.tightlyRestricted,
                   shareability: Int = Content.shareability.shareable,
                   authKey: String = HashTools.md5Hex(util.Random.nextString(16)), labels: List[String] = Nil, views: Long = 0)
  extends SQLSavable with SQLDeletable {

  /**
   * Saves this content link to the DB
   * @return The optionally updated content
   */
  def save: Content = {
    if (id.isDefined) {
      update(Content.tableName, 'id -> id.get, 'name -> normalize(name), 'contentType -> contentType.name, 'thumbnail -> thumbnail,
        'resourceId -> resourceId, 'dateAdded -> dateAdded, 'visibility -> visibility, 'shareability -> shareability,
        'authKey -> authKey, 'labels -> normalize(labels.mkString(",")), 'views -> views)
      this
    } else {
      val id = insert(Content.tableName, 'name -> normalize(name), 'contentType -> contentType.name, 'thumbnail -> thumbnail,
        'resourceId -> resourceId, 'dateAdded -> dateAdded, 'visibility -> visibility, 'shareability -> shareability,
        'authKey -> authKey, 'labels -> normalize(labels.mkString(",")), 'views -> views)
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
    "views" -> views,
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
    get[Option[Long]](tableName + ".id") ~
      get[String](tableName + ".name") ~
      get[String](tableName + ".contentType") ~
      get[String](tableName + ".thumbnail") ~
      get[String](tableName + ".resourceId") ~
      get[String](tableName + ".dateAdded") ~
      get[Int](tableName + ".visibility") ~
      get[Int](tableName + ".shareability") ~
      get[String](tableName + ".authKey") ~
      get[String](tableName + ".labels") ~
      get[Long](tableName + ".views") map {
      case id ~ name ~ contentType ~ thumbnail ~ resourceId ~ dateAdded ~ visibility ~ shareability ~ authKey ~ labels ~ views =>
        Content(id, name, Symbol(contentType), thumbnail, resourceId, dateAdded, visibility, shareability,
          authKey, labels.split(",").toList.filterNot(_.isEmpty), views)
    }
  }

  /**
   * Parser for getting (content, user) tuple in order to display content ownership
   */
  val contentOwnership = {
    // content object
    get[Option[Long]]("contentId") ~
    get[String]("cname") ~
    get[String]("contentType") ~
    get[String]("thumbnail") ~
    get[String]("resourceId") ~
    get[String]("dateAdded") ~
    get[Int]("visibility") ~
    get[Int]("shareability") ~
    get[String]("authKey") ~
    get[String]("labels") ~
    get[Long]("views") ~
    // user object
    get[Option[Long]]("userId") ~
    get[String]("authId") ~
    get[String]("authScheme") ~
    get[String]("username") ~
    get[String]("name") ~
    get[String]("email") ~
    get[Option[String]]("picture") ~
    get[Long]("accountLinkId") ~
    get[String]("created") ~
    get[String]("lastLogin") map {
      case contentId ~ cname ~ contentType ~ thumbnail ~ resourceId ~ dateAdded ~ visibility ~ shareability ~ authKey ~ labels ~ views ~
        userId ~ authId ~ authScheme ~ username ~ name ~ email ~ picture ~ accountLinkId ~ created ~ lastLogin =>
          Content(contentId, cname, Symbol(contentType), thumbnail, resourceId, dateAdded, visibility, shareability,
          authKey, labels.split(",").toList.filterNot(_.isEmpty), views) -> 
          User(userId, authId, Symbol(authScheme), username, Some(name), Some(email), picture, accountLinkId, created, lastLogin)
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
   * Gets all content and owners information
   * @return map of contentId's to tuple (owner, email)
   */
  def ownershipList: List[(Content, User)] = {
    DB.withConnection {
      implicit connection =>
        anorm.SQL("""SELECT * FROM ((SELECT content.name AS cname, content . * , contentOwnership.contentId, contentOwnership.userId
          FROM content JOIN contentOwnership ON content.id = contentOwnership.contentid) AS listing
          JOIN userAccount ON userAccount.id = listing.userId)""").as(contentOwnership *)
    }
  }

  /**
   * Gets all the public content sorted by newest first
   * @return The list of content
   */
  def listPublic(count: Long): List[Content] =
    DB.withConnection {
      implicit connection =>
        anorm.SQL("select * from " + tableName + " where visibility = 4 order by id desc limit {count}")
          .on('count -> count).as(simple *)
    }

  /**
   * Create a content from fixture data
   * @param data Fixture data
   * @return The content
   */
  def fromFixture(data: (String, Symbol, String, String)): Content =
    Content(None, data._1, data._2, data._3, data._4)

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
        SQL("DELETE from " +  settingTable + " where contentId = {cid} and setting = {setting}")
          .on('cid -> content.id.get, 'setting -> setting).execute()
        argument.foreach { arg =>
          SQL("INSERT into " +  settingTable + " (contentId, setting, argument) values ({cid}, {setting}, {argument})")
          .on('cid -> content.id.get, 'setting -> setting, 'argument -> arg).execute()
        }
    }

  def addSetting(content: Content, setting: String, argument: Seq[String]) =
    DB.withConnection {
      implicit connection =>
        argument.foreach { arg =>
          anorm.SQL("INSERT into " +  settingTable + " (contentId, setting, argument) values ({cid}, {setting}, {argument})")
          .on('cid -> content.id.get, 'setting -> setting, 'argument -> arg).execute()
        }
    }

  def removeSetting(content: Content, setting: String, argument: Seq[String]) =
    DB.withConnection {
      implicit connection =>
        argument.foreach { arg =>
          anorm.SQL("DELETE from " +  settingTable + " where contentId = {cid} and setting = {setting} and argument = {argument}")
          .on('cid -> content.id.get, 'setting -> setting, 'argument -> arg).execute()
        }
    }

  def getSetting(content: Content, setting: String): List[String] =
    DB.withConnection {
      implicit connection =>
        anorm.SQL("SELECT argument from " +  settingTable + " where contentId = {cid} and setting = {setting}")
          .on('cid -> content.id.get, 'setting -> setting).as(get[String](settingTable + ".argument") *)
    }

  def getSettingMap(content: Content): Map[String, List[String]] =
    DB.withConnection {
      implicit connection =>
        val plist: List[(String, String)] = anorm.SQL("SELECT setting, argument from " +  settingTable + " where contentId = {cid}")
          .on('cid -> content.id.get).as(
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

  /**
   * Increments the views for a specific content item
   * @param id The content id
   */
  def incrementViews(id: Long) =
    DB.withConnection {
      implicit connection =>
        anorm.SQL("UPDATE " + tableName + " set views = views + 1 where id = {cid}").on('cid -> id).executeUpdate()
    }
}