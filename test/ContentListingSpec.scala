import anorm.NotAssigned
import models.{Course, ContentListing, Content}
import org.specs2.mutable._

import play.api.test._
import play.api.test.Helpers._

/**
 * Tests all the methods in the course model
 */
class ContentListingSpec extends Specification {
  
  "Content Listings" should {
    
    "be savable to the DB" in {
      running(FakeApplication()) {
        // Save the content listing to the db and get a listing, before and after
        val content1 = ContentListing.list
        val newContent = ContentListing(NotAssigned, 1, 2).save
        val content2 = ContentListing.list
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
        // Create a content listing and delete it. Check the size of the listings before and after
        val newContent = ContentListing(NotAssigned, 1, 2).save
        val content1 = ContentListing.list
        newContent.delete()
        val content2 = ContentListing.list

        // Check results
        content1.size must beEqualTo(content2.size + 1)
      }
    }

    "be selectable from DB by id" in {
      running(FakeApplication()) {
        // Make a content listing, then look up that content by its id
        val content1 = ContentListing(NotAssigned, 1, 2).save
        val content2 = ContentListing.findById(content1.id.get).get

        // Cleanup
        content1.delete()

        // Check the results
        content1 must beEqualTo(content2)
      }
    }

    "be listable from DB" in {
      running(FakeApplication()) {
        // List all the content listing from the DB
        val content = ContentListing.list

        // Check the results
        content must not(beEmpty)
      }
    }

    "be listable by course" in {
      running(FakeApplication()) {
        val course = Course(NotAssigned, "name", "start", "end", "settings").save
        val content = Content(NotAssigned, "someId").save
        val contentListing = course.addContent(content)
        val allContentListing = ContentListing.listByCourse(course)

        // Cleanup
        course.removeContent(content).delete()
        content.delete()

        // Check the results
        allContentListing must contain(contentListing)
      }
    }

    "list content by course" in {
      running(FakeApplication()) {
        val course = Course(NotAssigned, "name", "start", "end", "settings").save
        val content = Content(NotAssigned, "someId").save
        course.addContent(content)
        val contentListing = ContentListing.listClassContent(course)

        // Cleanup
        course.removeContent(content).delete()
        content.delete()

        // Check the results
        contentListing must contain(content)
      }
    }

  }
}