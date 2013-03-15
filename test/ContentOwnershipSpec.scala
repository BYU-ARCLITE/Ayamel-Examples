import anorm.NotAssigned
import models.{Content, ContentOwnership, User}
import org.specs2.mutable._

import play.api.test._
import play.api.test.Helpers._

/**
 * Tests all the methods in the course model
 */
class ContentOwnershipSpec extends Specification {

  "Content ownership" should {

    "be savable to the DB" in {
      running(FakeApplication()) {
        // Save the content ownership to the db and get a listing, before and after
        val content1 = ContentOwnership.list
        val ownership = ContentOwnership(NotAssigned, 1, 2).save
        val content2 = ContentOwnership.list
        val difference = content2 diff content1

        // Cleanup
        ownership.delete()

        // Check the results
        difference.size must beEqualTo(1)
        difference(0) must beEqualTo(ownership)
      }
    }

    "be deletable from the DB" in {
      running(FakeApplication()) {
        // Create a content ownership and delete it. Check the size of the listings before and after
        val newContent = ContentOwnership(NotAssigned, 1, 2).save
        val content1 = ContentOwnership.list
        newContent.delete()
        val content2 = ContentOwnership.list

        // Check results
        content1.size must beEqualTo(content2.size + 1)
      }
    }

    "be selectable from DB by id" in {
      running(FakeApplication()) {
        // Make a content ownership, then look up that content by its id
        val content1 = ContentOwnership(NotAssigned, 1, 2).save
        val content2 = ContentOwnership.findById(content1.id.get).get

        // Cleanup
        content1.delete()

        // Check the results
        content1 must beEqualTo(content2)
      }
    }

    "be listable from DB" in {
      running(FakeApplication()) {
        // List all the content ownership from the DB
        val content = ContentOwnership.list

        // Check the results
        content must not(beEmpty)
      }
    }

    "be listable by user" in {
      running(FakeApplication()) {
        // Create a user and a couple of ownerships, then list
        val user = User(NotAssigned, "auth", 'scheme, "uname").save
        val content1 = Content(NotAssigned, "c1", 'blah, "", "", "").save
        val content2 = Content(NotAssigned, "c2", 'blah, "", "", "").save
        val ownership1 = ContentOwnership(NotAssigned, user.id.get, content1.id.get).save
        val ownership2 = ContentOwnership(NotAssigned, user.id.get, content2.id.get).save
        val list = ContentOwnership.listByUser(user)

        // Cleanup
        user.delete()
        content1.delete()
        content2.delete()
        ownership1.delete()
        ownership2.delete()

        // Check the results
        list must contain(content1)
        list must contain(content2)
      }
    }

  }
}