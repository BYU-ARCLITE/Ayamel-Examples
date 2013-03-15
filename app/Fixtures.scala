import anorm.NotAssigned
import collection.mutable.ListBuffer
import models._
import play.api.Logger
import scala.Some
import tools.HashTools



object Fixtures {

  object data {
    val passwordHash = HashTools.sha256Base64("test123")
    val users = List(
      (passwordHash, 'password, "student1",  Some("Student 1"),  Some("s1@ayamel.byu.edu"), 1),
      (passwordHash, 'password, "student2",  Some("Student 2"),  Some("s2@ayamel.byu.edu"), 1),
      (passwordHash, 'password, "student3",  Some("Student 3"),  Some("s3@ayamel.byu.edu"), 1),
      (passwordHash, 'password, "student4",  Some("Student 4"),  Some("s4@ayamel.byu.edu"), 1),
      (passwordHash, 'password, "student5",  Some("Student 5"),  Some("s5@ayamel.byu.edu"), 1),
      (passwordHash, 'password, "student6",  Some("Student 6"),  Some("s6@ayamel.byu.edu"), 1),
      (passwordHash, 'password, "teacher1",  Some("Teacher 1"),  Some("t1@ayamel.byu.edu"), 2),
      (passwordHash, 'password, "teacher2",  Some("Teacher 2"),  Some("t2@ayamel.byu.edu"), 2),
      (passwordHash, 'password, "teacher3",  Some("Teacher 3"),  Some("t3@ayamel.byu.edu"), 2),
      (passwordHash, 'password, "teacher4",  Some("Teacher 4"),  Some("t4@ayamel.byu.edu"), 2),
      (passwordHash, 'password, "teacher5",  Some("Teacher 5"),  Some("t5@ayamel.byu.edu"), 2),
      (passwordHash, 'password, "teacher6",  Some("Teacher 6"),  Some("t6@ayamel.byu.edu"), 2),
      (passwordHash, 'password, "director1", Some("Director 1"), Some("d1@ayamel.byu.edu"), 3),
      (passwordHash, 'password, "director2", Some("Director 2"), Some("d2@ayamel.byu.edu"), 3),
      (passwordHash, 'password, "manager1",  Some("Manager 1"),  Some("m1@ayamel.byu.edu"), 4),
      (passwordHash, 'password, "manager2",  Some("Manager 2"),  Some("m2@ayamel.byu.edu"), 4),
      (passwordHash, 'password, "officer1",  Some("Officer 1"),  Some("o1@ayamel.byu.edu"), 5),
      (passwordHash, 'password, "officer2",  Some("Officer 2"),  Some("o2@ayamel.byu.edu"), 5),
      (passwordHash, 'password, "admin1",    Some("Admin 1"),    Some("a1@ayamel.byu.edu"), 6),
      (passwordHash, 'password, "admin2",    Some("Admin 2"),    Some("a2@ayamel.byu.edu"), 6)
    )

    val institutions = List(
      ("Institution 1", "Provo, UT",     "Some description goes here", Some("http://landscape.byu.edu/portals/13/images/BYU_logo.jpg")),
      ("Institution 2", "San Diego, CA", "Some description goes here", Some("http://landscape.byu.edu/portals/13/images/BYU_logo.jpg")),
      ("Institution 3", "Boise, ID",     "Some description goes here", Some("http://landscape.byu.edu/portals/13/images/BYU_logo.jpg")),
      ("Institution 4", "Paris, France", "Some description goes here", Some("http://landscape.byu.edu/portals/13/images/BYU_logo.jpg"))
    )

    val content = List(
      "resource1",
      "resource2",
      "resource3",
      "resource4",
      "resource5",
      "resource6",
      "resource7",
      "resource8"
    )

    val courses = List(
      ("Course 101", "2013-03-14T20:37:01.665Z", "2014-03-14T20:37:01.665Z", "{}"),
      ("Course 102", "2013-03-14T20:37:01.665Z", "2014-03-14T20:37:01.665Z", "{}"),
      ("Course 103", "2013-03-14T20:37:01.665Z", "2014-03-14T20:37:01.665Z", "{}"),
      ("Course 104", "2013-03-14T20:37:01.665Z", "2014-03-14T20:37:01.665Z", "{}"),
      ("Course 105", "2013-03-14T20:37:01.665Z", "2014-03-14T20:37:01.665Z", "{}")
    )

    val courseListings = List(
      (0, 0),
      (1, 0),
      (2, 1),
      (3, 2),
      (4, 3)
    )

    val courseMembership = List(
      (0, 0,  false),
      (1, 0,  false),
      (1, 1,  false),
      (2, 1,  false),
      (2, 2,  false),
      (3, 2,  false),
      (3, 3,  false),
      (4, 3,  false),
      (0, 4,  false),
      (0, 5,  false),
      (0, 6,  true),
      (1, 7,  true),
      (2, 8,  true),
      (3, 9,  true),
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
      (0,  0),
      (1,  1),
      (3,  2),
      (4,  3),
      (6,  4),
      (7,  5),
      (9,  6),
      (10, 7)
    )

    val directorship = List(
      (12, 0),
      (12, 1),
      (13, 2)
    )
  }

  def create() {

    // Create the objects
    val users = new ListBuffer[User]()
    val institutions = new ListBuffer[Institution]()
    val content = new ListBuffer[Content]()
    val courses = new ListBuffer[Course]()

    Logger.info("Creating user fixtures")
    data.users foreach {
      userData => users.append(User.fromFixture(userData).save)
    }

    Logger.info("Creating institution fixtures")
    data.institutions foreach {
      institutionData => institutions.append(Institution.fromFixture(institutionData).save)
    }

    Logger.info("Creating content fixtures")
    data.content foreach {
      resourceId => content.append(Content(NotAssigned, resourceId).save)
    }

    Logger.info("Creating course fixtures")
    data.courses foreach {
      courseData => courses.append(Course.fromFixture(courseData).save)
    }

    // Create the connections
    Logger.info("Creating course listing fixtures")
    data.courseListings.foreach {
      data => CourseListing(NotAssigned, institutions(data._2).id.get, courses(data._1).id.get).save
    }

    Logger.info("Creating course membership fixtures")
    data.courseMembership.foreach {
      data => CourseMembership(NotAssigned, users(data._2).id.get, courses(data._1).id.get, data._3).save
    }

    Logger.info("Creating content listing fixtures")
    data.contentListing.foreach {
      data => ContentListing(NotAssigned, courses(data._1).id.get, content(data._2).id.get).save
    }

    Logger.info("Creating content ownership fixtures")
    data.contentOwnership.foreach {
      data => ContentOwnership(NotAssigned, users(data._1).id.get, content(data._2).id.get).save
    }

    Logger.info("Creating directorship fixtures")
    data.directorship.foreach {
      data => Directorship(NotAssigned, users(data._1).id.get, institutions(data._2).id.get).save
    }

  }
}
