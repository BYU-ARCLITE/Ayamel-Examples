package models

import anorm.{NotAssigned, ~, Pk}
import dataAccess.sqlTraits.{SQLSelectable, SQLDeletable, SQLSavable}
import anorm.SqlParser._
import service.{HashTools, SerializationTools, TimeTools}
import play.api.db.DB
import play.api.Play.current
import play.api.libs.json.{Json, JsValue}
import concurrent.Future
import dataAccess.ResourceController

/**
 * This links a resource object (in a resource library) to this system
 * @param id The id of this link in the DB
 * @param resourceId The id of the resource
 */
case class Content(id: Pk[Long], name: String, contentType: Symbol, thumbnail: String, resourceId: String,
                   dateAdded: String = TimeTools.now(), visibility: Int = Content.visibility.tightlyRestricted,
                   shareability: Int = Content.shareability.shareable, settings: Map[String, String] = Map(),
                   authKey: String = HashTools.md5Hex(util.Random.nextString(16)), labels: List[String] = Nil)
  extends SQLSavable with SQLDeletable {

  /**
   * Saves this content link to the DB
   * @return The optionally updated content
   */
  def save: Content = {
    if (id.isDefined) {
      update(Content.tableName, 'id -> id, 'name -> name, 'contentType -> contentType.name, 'thumbnail -> thumbnail,
        'resourceId -> resourceId, 'dateAdded -> dateAdded, 'visibility -> visibility, 'shareability -> shareability,
        'settings -> SerializationTools.serializeMap(settings), 'authKey -> authKey, 'labels -> labels.mkString(","))
      this
    } else {
      val id = insert(Content.tableName, 'name -> name, 'contentType -> contentType.name, 'thumbnail -> thumbnail,
        'resourceId -> resourceId, 'dateAdded -> dateAdded, 'visibility -> visibility, 'shareability -> shareability,
        'settings -> SerializationTools.serializeMap(settings), 'authKey -> authKey, 'labels -> labels.mkString(","))
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

  def setSetting(key: String, value: String): Content =
    copy(settings = settings.updated(key, value))

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
   * 2. Tightly Restricted - The owner and courses he/she add this to can see this.
   * 3. Loosely Restricted - The owner, teachers, and courses they add this to can see this.
   * 4. Public - Everybody can see this.
   * @param user The user to be checked
   * @return Visible or not
   */
  def isVisibleBy(user: User): Boolean = {
    // Always true if the user is an admin or the owner
    if (user.role == User.roles.admin || user.getContent.contains(this))
      true
    else
      // Check the visibility attribute of the content object
      visibility match {
        case Content.visibility.tightlyRestricted => user.getEnrollment.flatMap(_.getContent).contains(this)
        case Content.visibility.looselyRestricted => user.role == User.roles.teacher || user.getEnrollment.flatMap(_.getContent).contains(this)
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
   * @param user The to check
   * @return Can edit or not
   */
  def isEditableBy(user: User): Boolean =
    user.role == User.roles.admin || user.getContent.contains(this)

  def level = settings.get("level").getOrElse(Content.defaultSettings.video.level)

  def enabledCaptionTracks: List[String] =
    if (settings.get("enabledCaptionTracks").isDefined)
      settings("enabledCaptionTracks").split(",").toList
    else
      Nil

  def enabledAnnotationDocuments: List[String] =
    if (settings.get("enabledAnnotationDocuments").isDefined)
      settings("enabledAnnotationDocuments").split(",").toList
    else
      Nil

  def includeTranscriptions: String = settings.get("includeTranscriptions").getOrElse("false")

  def toJson = Json.obj(
    "id" -> id.get,
    "name" -> name,
    "contentType" -> contentType.name,
    "thumbnail" -> thumbnail,
    "resourceId" -> resourceId,
    "dateAdded" -> dateAdded,
    "visibility" -> visibility,
    "shareability" -> shareability,
    "settings" -> settings,
    "authKey" -> authKey,
    "views" -> views("").size,
    "labels" -> labels
  )

  val cacheTarget = this
  object cache {
    var activity: Option[List[Activity]] = None
    var owner: Option[User] = None

    def getActivity: List[Activity] = {
      if (activity.isEmpty)
        activity = Some(Activity.listByPage("content", "view", id.get))
      activity.get
    }

    def getOwner: User = {
      if (owner.isEmpty)
        owner = User.findById(ContentOwnership.findByContent(cacheTarget).userId)
      owner.get
    }
  }

  def getOwner = cache.getOwner

  def getActivity(coursePrefix: String) = cache.getActivity.filter(_.activityContext.pageContext.action.startsWith(coursePrefix))

  def views(coursePrefix: String) = getActivity(coursePrefix).filter(_.verb == "pageload")

  def translations(coursePrefix: String) = getActivity(coursePrefix).filter(_.verb == "translate")

  def annotations(coursePrefix: String) = getActivity(coursePrefix).filter(_.verb == "view annotation")

  def cueClicks(coursePrefix: String) = getActivity(coursePrefix).filter(_.verb == "cueClick")
}

object Content extends SQLSelectable[Content] {
  val tableName = "content"

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

  /* Default settings */
  object defaultSettings {
    object video {
      val level = "1"
    }

    object image {
      val allowAnnotations = "true"
    }

    val preset = Map(
      'video -> Map(
        "level" -> video.level
      ),
      'image -> Map("allowAnnotations" -> image.allowAnnotations),
      'audio -> Map("blah" -> "blah"),
      'playlist -> Map("blah" -> "blah"),
      'activity -> Map("blah" -> "blah")
    )
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
      get[String](tableName + ".settings") ~
      get[String](tableName + ".authKey") ~
      get[String](tableName + ".labels") map {
      case id ~ name ~ contentType ~ thumbnail ~ resourceId ~ dateAdded ~ visibility ~ shareability ~ settings ~ authKey ~ labels =>
        Content(id, name, Symbol(contentType), thumbnail, resourceId, dateAdded, visibility, shareability,
          if (settings.isEmpty) defaultSettings.preset(Symbol(contentType)) else SerializationTools.deserializeMap(settings),
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
        // TODO: Search the resource library metadata
        anorm.SQL("SELECT * from " + tableName + " where name like {query} and visibility = {public}")
          .on('query -> sqlQuery, 'public -> visibility.public).as(simple *)
    }
}