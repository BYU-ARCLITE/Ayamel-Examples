import anorm.NotAssigned
import models.{Content, User, Course}
import org.specs2.mutable._

import play.api.test._
import play.api.test.Helpers._

/**
 * Tests all the methods in the course model
 */
class CourseSpec extends Specification {
  
  "Courses" should {
    
    "be savable to the DB" in {
      running(FakeApplication()) {
        // Save the course to the db and get a listing, before and after
        val courses1 = Course.list
        val newCourse = Course(NotAssigned, "Some course", "start", "end", "").save
        val courses2 = Course.list
        val difference = courses2 diff courses1

        // Cleanup
        newCourse.delete()

        // Check the results
        difference.size must beEqualTo(1)
        difference(0) must beEqualTo(newCourse)
      }
    }

    "be deletable from the DB" in {
      running(FakeApplication()) {
        // Create a course and delete it. Check the size of the listings before and after
        val newCourse = Course(NotAssigned, "Some course", "start", "end", "").save
        val courses1 = Course.list
        newCourse.delete()
        val courses2 = Course.list

        // Check results
        courses1.size must beEqualTo(courses2.size + 1)
      }
    }

    "return their students" in {
      running(FakeApplication()) {
        // Create a course and add two students. Then get the student listing
        val newCourse = Course(NotAssigned, "Some course", "start", "end", "").save
        val user1 = User(NotAssigned, "auth", 'scheme, "uname").save.enroll(newCourse)
        val user2 = User(NotAssigned, "auth", 'scheme, "uname").save.enroll(newCourse)
        val students = newCourse.getStudents

        // Cleanup
        user1.unenroll(newCourse).delete()
        user2.unenroll(newCourse).delete()
        newCourse.delete()

        // Check the results
        students.size must beEqualTo(2)
        students must contain(user1)
        students must contain(user2)
      }
    }

    "return their teachers" in {
      running(FakeApplication()) {
        // Create a course and add two teachers. Then get the teacher listing
        val newCourse = Course(NotAssigned, "Some course", "start", "end", "").save
        val user1 = User(NotAssigned, "auth", 'scheme, "uname").save.enroll(newCourse, teacher = true)
        val user2 = User(NotAssigned, "auth", 'scheme, "uname").save.enroll(newCourse, teacher = true)
        val teachers = newCourse.getTeachers

        // Cleanup
        user1.unenroll(newCourse).delete()
        user2.unenroll(newCourse).delete()
        newCourse.delete()

        // Check the results
        teachers.size must beEqualTo(2)
        teachers must contain(user1)
        teachers must contain(user2)
      }
    }

    "return their content" in {
      running(FakeApplication()) {
        // Create a course, add two content objects, then get the content listing
        val newCourse = Course(NotAssigned, "Some course", "start", "end", "").save
        val content1 = Content(NotAssigned, "asdf").save
        val content2 = Content(NotAssigned, "asdf").save
        newCourse.addContent(content1)
        newCourse.addContent(content2)
        val content = newCourse.getContent

        // Cleanup
        newCourse.removeContent(content1).removeContent(content2).delete()
        content1.delete()
        content2.delete()

        // Check results
        content.size must beEqualTo(2)
        content must contain(content1)
        content must contain(content2)
      }
    }

    "return their announcements" in {
      running(FakeApplication()) {
        // Create a course, make two announcements, then get the announcement listing
        val newCourse = Course(NotAssigned, "Some course", "start", "end", "").save
        val user = User(NotAssigned, "asdf", 'qwerty, "asdf").save
        val announcement1 = newCourse.makeAnnouncement(user, "This is an announcement 1")
        val announcement2 = newCourse.makeAnnouncement(user, "This is an announcement 2")
        val announcements = newCourse.getAnnouncements

        // Cleanup
        newCourse.delete()
        user.delete()
        announcement1.delete()
        announcement2.delete()

        // Check results
        announcements.size must beEqualTo(2)
        announcements must contain(announcement1)
        announcements must contain(announcement2)
      }
    }

    "return their requests" in {
      running(FakeApplication()) {
        // Create a course, two users, and have them request access to the course
        val newCourse = Course(NotAssigned, "Some course", "start", "end", "").save
        val user1 = User(NotAssigned, "asdf", 'qwerty, "asdf").save
        val user2 = User(NotAssigned, "asdf", 'qwerty, "asdf").save
        val request1 = user1.requestEnrollment(newCourse, "")
        val request2 = user2.requestEnrollment(newCourse, "")
        val requests = newCourse.getRequests

        // Cleanup
        request1.delete()
        request2.delete()
        user1.delete()
        user2.delete()
        newCourse.delete()

        // Check the results
        requests.size must beEqualTo(2)
        requests must contain(request1)
        requests must contain(request2)
      }
    }

    "make announcements" in {
      running(FakeApplication()) {
        // Create a course and make an announcement, listing the announcements before and after
        val newCourse = Course(NotAssigned, "Some course", "start", "end", "").save
        val user = User(NotAssigned, "asdf", 'qwerty, "asdf").save
        val announcements1 = newCourse.getAnnouncements
        val announcement = newCourse.makeAnnouncement(user, "announcement")
        val announcements2 = newCourse.getAnnouncements

        // Cleanup
        newCourse.delete()
        user.delete()
        announcement.delete()

        // Check the results
        announcements1 must beEmpty
        announcements2 must contain(announcement)
      }
    }

    "add content" in {
      running(FakeApplication()) {
        // Create a course, add content, and list the content before and after
        val newCourse = Course(NotAssigned, "Some course", "start", "end", "").save
        val content1 = newCourse.getContent
        val content = Content(NotAssigned, "asdf").save
        newCourse.addContent(content)
        val content2 = newCourse.getContent

        // Cleanup
        newCourse.removeContent(content).delete()
        content.delete()

        // Check the results
        content1 must beEmpty
        content2 must contain(content)
      }
    }

    "remove content" in {
      running(FakeApplication()) {
        // Create a course, add content, list the content, delete, then list the content again
        val newCourse = Course(NotAssigned, "Some course", "start", "end", "").save
        val content = Content(NotAssigned, "asdf").save
        newCourse.addContent(content)
        val content1 = newCourse.getContent
        newCourse.removeContent(content)
        val content2 = newCourse.getContent

        // Cleanup
        newCourse.delete()
        content.delete()

        // Check the results
        content1 must contain(content)
        content2 must beEmpty
      }
    }

    "be selectable from DB by id" in {
      running(FakeApplication()) {
        // Make a course, then look up that course by its id
        val course1 = Course(NotAssigned, "Some course", "start", "end", "").save
        val course2 = Course.findById(course1.id.get).get

        // Cleanup
        course1.delete()

        // Check the results
        course1 must beEqualTo(course2)
      }
    }

    "be listable from DB" in {
      running(FakeApplication()) {
        // List all the courses from the DB
        val courses = Course.list

        // Check the results
        courses must not(beEmpty)
      }
    }

    "be created from fixture data" in {
      running(FakeApplication()) {
        // Create a course from fixture data and in the normal fashion
        val course1 = Course(NotAssigned, "name", "start", "end", "settings")
        val data = ("name", "start", "end", "settings")
        val course2 = Course.fromFixture(data)

        // Check the results
        course1 must beEqualTo(course2)
      }
    }

  }
}