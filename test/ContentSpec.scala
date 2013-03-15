import anorm.NotAssigned
import models.{Course, Content}
import org.specs2.mutable._

import play.api.test._
import play.api.test.Helpers._

/**
 * Tests all the methods in the course model
 */
class ContentSpec extends Specification {

  "Content" should {

    "be savable to the DB" in {
      running(FakeApplication()) {
        // Save the content to the db and get a listing, before and after
        val content1 = Content.list
        val newContent = Content(NotAssigned, "someId", 'blah, "", "", "").save
        val content2 = Content.list
        val difference = content2 diff content1

        // Cleanup
        newContent.delete()

        // Check the results
        difference.size must beEqualTo(1)
        difference(0) must beEqualTo(newContent)
      }
    }

    "be deletable from the DB" in {
      running(FakeApplication()) {
        // Create a content and delete it. Check the size of the listings before and after
        val newContent = Content(NotAssigned, "someId", 'blah, "", "", "").save
        val content1 = Content.list
        newContent.delete()
        val content2 = Content.list

        // Check results
        content1.size must beEqualTo(content2.size + 1)
      }
    }

    "be selectable from DB by id" in {
      running(FakeApplication()) {
        // Make a content, then look up that content by its id
        val content1 = Content(NotAssigned, "someId", 'blah, "", "", "").save
        val content2 = Content.findById(content1.id.get).get

        // Cleanup
        content1.delete()

        // Check the results
        content1 must beEqualTo(content2)
      }
    }

    "be listable from DB" in {
      running(FakeApplication()) {
        // List all the content from the DB
        val content = Content.list

        // Check the results
        content must not(beEmpty)
      }
    }

    "be created from fixture data" in {
      running(FakeApplication()) {
        // Create a course from fixture data and in the normal fashion
        val content1 = Content(NotAssigned, "name", 'video, "thumb", "resourceId")
        val data = ("name", 'video, "thumb", "resourceId")
        val content2 = Content.fromFixture(data)

        // Check the results
        content1 must beEqualTo(content2)
      }
    }

  }
}