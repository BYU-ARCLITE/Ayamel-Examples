import collection.mutable.ListBuffer
import models._
import play.api.Logger
import scala.Some
import service.HashTools

object Fixtures {

  object data {
    val passwordHash = HashTools.sha256Base64("test123")
    val users = List(
      (passwordHash, 'password, "student1", Some("Student 1"), Some("s1@ayamel.byu.edu"), 'student),
      (passwordHash, 'password, "student2", Some("Student 2"), Some("s2@ayamel.byu.edu"), 'student),
      (passwordHash, 'password, "student3", Some("Student 3"), Some("s3@ayamel.byu.edu"), 'student),
      (passwordHash, 'password, "student4", Some("Student 4"), Some("s4@ayamel.byu.edu"), 'student),
      (passwordHash, 'password, "student5", Some("Student 5"), Some("s5@ayamel.byu.edu"), 'student),
      (passwordHash, 'password, "student6", Some("Student 6"), Some("s6@ayamel.byu.edu"), 'student),
      (passwordHash, 'password, "teacher1", Some("Teacher 1"), Some("t1@ayamel.byu.edu"), 'teacher),
      (passwordHash, 'password, "teacher2", Some("Teacher 2"), Some("t2@ayamel.byu.edu"), 'teacher),
      (passwordHash, 'password, "teacher3", Some("Teacher 3"), Some("t3@ayamel.byu.edu"), 'teacher),
      (passwordHash, 'password, "teacher4", Some("Teacher 4"), Some("t4@ayamel.byu.edu"), 'teacher),
      (passwordHash, 'password, "teacher5", Some("Teacher 5"), Some("t5@ayamel.byu.edu"), 'teacher),
      (passwordHash, 'password, "teacher6", Some("Teacher 6"), Some("t6@ayamel.byu.edu"), 'teacher),
      (passwordHash, 'password, "admin", Some("Admin"), Some("admin@ayamel.byu.edu"), 'admin)
    )

    val content = List(
      ("Dreyfus by Yves Duteil", 'video, "", "515c9b7d35e544681f000000"),
      ("Resource 2", 'video, "", "resource2"),
      ("Resource 3", 'video, "", "resource3"),
      ("Resource 4", 'video, "", "resource4"),
      ("Resource 5", 'video, "", "resource5"),
      ("Resource 6", 'video, "", "resource6"),
      ("Resource 7", 'video, "", "resource7"),
      ("Resource 8", 'video, "", "resource8")
    )

    val courses = List(
      ("Course 101", "2013-03-14T20:37:01.665Z", "2014-03-14T20:37:01.665Z", 'closed, "key1"),
      ("Course 102", "2013-03-14T20:37:01.665Z", "2014-03-14T20:37:01.665Z", 'closed, "key2"),
      ("Course 103", "2013-03-14T20:37:01.665Z", "2014-03-14T20:37:01.665Z", 'closed, "key3"),
      ("Course 104", "2013-03-14T20:37:01.665Z", "2014-03-14T20:37:01.665Z", 'closed, "key4"),
      ("Course 105", "2013-03-14T20:37:01.665Z", "2014-03-14T20:37:01.665Z", 'closed, "key5")
    )

    val courseListings = List(
      (0, 0),
      (1, 0),
      (2, 1),
      (3, 2),
      (4, 3)
    )

    val courseMembership = List(
      (0, 0, false),
      (1, 0, false),
      (1, 1, false),
      (2, 1, false),
      (2, 2, false),
      (3, 2, false),
      (3, 3, false),
      (4, 3, false),
      (0, 4, false),
      (0, 5, false),
      (0, 6, true),
      (1, 7, true),
      (2, 8, true),
      (3, 9, true),
      (4, 10, true),
      (0, 11, true)
    )

    val contentListing = List(
      (0, 0),
      (1, 1),
      (2, 2),
      (3, 3),
      (4, 4),
      (0, 5),
      (1, 6),
      (2, 7)
    )

    val contentOwnership = List(
      (0, 0),
      (1, 1),
      (3, 2),
      (4, 3),
      (6, 4),
      (7, 5),
      (9, 6),
      (10, 7)
    )

  }

  val helpPages = List(
    "Updating account information",
    "Changing your password",
    "Merging accounts",
    "Notifications",
    "Searching",
    "Course directory",
    "Joining courses",
    "Making announcements",
    "Adding content you own to a course",
    "Content types",
    "Browsing content",
    "Viewing content",
    "Viewing captions and transcripts",
    "Translating",
    "Viewing annotations",
    "Sharing content",
    "Viewing content information",
    "Public content listing",
    "Uploading",
    "Adding hosted content",
    "Adding a YouTube video",
    "Adding a Brightcove video",
    "Create from existing resource",
    "Content settings",
    "Updating metadata",
    "Setting a thumbnail",
    "Setting the shareability",
    "Setting the visibility",
    "Deleting content",
    "Ownership and availability",
    "Uploading captions",
    "Creating new annotations",
    "Editing existing annotations",
    "Publishing personal captions and annotations",
    "Becoming a teacher",
    "Creating a course",
    "Adding content you don't own to a course",
    "Adding a course to a LMS",
    "Adding course content to a LMS",
    "Setting course captions and annotations",
    "How playlists work",
    "Creating a playlist",
    "Viewing a playlist"
  )

  val settings = List(
    ("notifications.emails", ""),
    ("notifications.notifyOn.error", "false"),
    ("notifications.notifyOn.errorReport", "true"),
    ("notifications.notifyOn.bugReport", "true"),
    ("notifications.notifyOn.rating", "false"),
    ("notifications.notifyOn.suggestion", "false"),
    ("notifications.users.emailOn.notification", "true"),
    ("help.gettingStartedContent", "0")
  )

  def create() {

    // Create the objects
    val users = new ListBuffer[User]()
    val content = new ListBuffer[Content]()
    val courses = new ListBuffer[Course]()

    Logger.info("Creating user fixtures")
    data.users foreach {
      userData => users.append(User.fromFixture(userData).save)
    }

    Logger.info("Creating content fixtures")
    data.content foreach {
      contentData => content.append(Content.fromFixture(contentData).save)
    }

    Logger.info("Creating course fixtures")
    data.courses foreach {
      courseData => courses.append(Course.fromFixture(courseData).save)
    }

    Logger.info("Creating course membership fixtures")
    data.courseMembership.foreach {
      data => CourseMembership(None, users(data._2).id.get, courses(data._1).id.get, data._3).save
    }

    Logger.info("Creating content listing fixtures")
    data.contentListing.foreach {
      data => ContentListing(None, courses(data._1).id.get, content(data._2).id.get).save
    }

    Logger.info("Creating content ownership fixtures")
    data.contentOwnership.foreach {
      data => ContentOwnership(None, users(data._1).id.get, content(data._2).id.get).save
    }

  }

  def createHomePageContent() {
    Logger.info("Creating home page content fixtures")

    HomePageContent(None, "Enrich your studies",
      "With Ayamel, increase your language speaking ability.",
      "", "", "/assets/images/home/byu-campus.jpg", active = true).save

    HomePageContent(None, "Pardon our dust",
      "We're working hard to provide language learning magic, so there may be some things don't work well, or at all. Please be patient. You will be rewarded as awesomeness occurs.",
      "", "", "/assets/images/home/construction.jpg", active = true).save
  }

  def createHelpPages() {
    Logger.info("Creating help pages")

    helpPages.foreach(title => HelpPage(None, title, "", "Uncategorized").save)
  }

  def setupSetting() {
    Logger.info("Checking settings...")

    settings.foreach { setting =>
      if (Setting.findByName(setting._1).isEmpty) {
        Logger.info("Adding setting: " + setting._1)
        Setting(None, setting._1, setting._2).save
      }
    }
  }
}
