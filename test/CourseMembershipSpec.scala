import anorm.NotAssigned
import models._
import org.specs2.mutable._

import play.api.test.FakeApplication
import play.api.test.Helpers._

/**
 * Tests all the methods in the course model
 */
class CourseMembershipSpec extends Specification {

  "Course membership" should {

    "be savable to the DB" in {
      running(FakeApplication()) {
        // Save the course membership to the db and get a listing, before and after
        val membership1 = CourseMembership.list
        val membership = CourseMembership(NotAssigned, 1, 2, teacher = false).save
        val membership2 = CourseMembership.list
        val difference = membership2 diff membership1

        // Cleanup
        membership.delete()

        // Check the results
        difference.size must beEqualTo(1)
        difference(0) must beEqualTo(membership)
      }
    }

    "be deletable from the DB" in {
      running(FakeApplication()) {
        // Create a course membership and delete it. Check the size of the listings before and after
        val newMembership = CourseMembership(NotAssigned, 1, 2, teacher = false).save
        val membership1 = CourseMembership.list
        newMembership.delete()
        val membership2 = CourseMembership.list

        // Check results
        membership1.size must beEqualTo(membership2.size + 1)
      }
    }

    "be selectable from DB by id" in {
      running(FakeApplication()) {
        // Make a course membership, then look up that content by its id
        val membership1 = CourseMembership(NotAssigned, 1, 2, teacher = false).save
        val membership2 = CourseMembership.findById(membership1.id.get).get

        // Cleanup
        membership1.delete()

        // Check the results
        membership1 must beEqualTo(membership2)
      }
    }

    "be listable from DB" in {
      running(FakeApplication()) {
        // List all the course membership from the DB
        val membership = CourseMembership.list

        // Check the results
        membership must not(beEmpty)
      }
    }

    "be listable by user" in {
      running(FakeApplication()) {
        // Create a user and a course listing, then list
        val user = User(NotAssigned, "auth", 'scheme, "uname").save
        val membership = CourseMembership(NotAssigned, user.id.get, 0, teacher = false).save
        val list = CourseMembership.listByUser(user)

        // Cleanup
        user.delete()
        membership.delete()

        // Check the results
        list must contain(membership)
      }
    }

    "list a user's courses" in {
      running(FakeApplication()) {
        // Create a user, a course, and a membership, then list
        val user = User(NotAssigned, "auth", 'scheme, "uname").save
        val course = Course(NotAssigned, "name", "start", "end", "").save
        val membership = CourseMembership(NotAssigned, user.id.get, course.id.get, teacher = false).save
        val list = CourseMembership.listUsersClasses(user)

        // Cleanup
        user.delete()
        course.delete()
        membership.delete()

        // Check the results
        list must contain(course)
      }
    }

    "list class members" in {
      running(FakeApplication()) {
        // Create a student, a teacher, and a course and create memberships for them in that course, then list
        val student = User(NotAssigned, "auth", 'scheme, "uname").save
        val teacher = User(NotAssigned, "auth", 'scheme, "uname").save
        val course = Course(NotAssigned, "name", "start", "end", "").save
        val membership1 = CourseMembership(NotAssigned, student.id.get, course.id.get, teacher = false).save
        val membership2 = CourseMembership(NotAssigned, teacher.id.get, course.id.get, teacher = true).save
        val students = CourseMembership.listClassMembers(course, teacher = false)
        val teachers = CourseMembership.listClassMembers(course, teacher = true)

        // Cleanup
        student.delete()
        teacher.delete()
        course.delete()
        membership1.delete()
        membership2.delete()

        // Check the results
        students must contain(student)
        teachers must contain(teacher)
      }
    }

  }
}