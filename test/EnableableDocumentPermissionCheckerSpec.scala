import models.{Content, User, Course}
import org.specs2.mutable._

import play.api.libs.json.Json
import service.DocumentPermissionChecker

/**
 * Tests all the methods in the course model
 */
class EnableableDocumentPermissionCheckerSpec extends Specification {

  val personalResource = Json.obj(
    "id" -> "josh1",
    "attributes" -> Json.obj(
      "ayamel_ownerType" -> "user",
      "ayamel_ownerId" -> "5"
    )
  )

  val courseResource = Json.obj(
    "id" -> "josh2",
    "attributes" -> Json.obj(
      "ayamel_ownerType" -> "course",
      "ayamel_ownerId" -> "8"
    )
  )

  val globalResource = Json.obj(
    "id" -> "josh3"
  )

  val user1 = User(Some(5), "", 'a, "")

  val user2 = User(Some(5), "", 'a, "", role = User.roles.admin)

  val course = Course(Some(8), "", "", "")
  course.cache.teachers = Some(Nil)

  "The enableable document permission checker" should {

    "allow personal documents" in {
      val content = Content(None, "", 'a, "", "")
      val checker = new DocumentPermissionChecker(user1, content, None, "captionTrack")

      checker.canEnable(personalResource) shouldEqual true
    }

    "allow course docs to a teacher in a course" in {
      val content = Content(None, "", 'a, "", "")
      val checker = new DocumentPermissionChecker(user2, content, Some(course), "captionTrack")

      checker.canEnable(courseResource) shouldEqual true
    }

    "not allow disabled global docs to a teacher in a course" in {
      val content1 = Content(None, "", 'a, "", "")
      val content2 = Content(None, "", 'a, "", "", settings = Map("enabledCaptionTracks" -> "asdf,qwer-234"))
      val checker1 = new DocumentPermissionChecker(user2, content1, Some(course), "captionTrack")
      val checker2 = new DocumentPermissionChecker(user2, content2, Some(course), "captionTrack")

      checker1.canEnable(globalResource) shouldEqual false
      checker2.canEnable(globalResource) shouldEqual false
    }

    "allow enabled global docs to a teacher in a course" in {
      val content = Content(None, "", 'a, "", "", settings = Map("enabledCaptionTracks" -> "asdf,josh3,qwer-234"))
      val checker = new DocumentPermissionChecker(user2, content, Some(course), "captionTrack")

      checker.canEnable(globalResource) shouldEqual true
    }

    "not allow course docs to a user who is not a teacher in a course" in {
      val content = Content(None, "", 'a, "", "")
      val checker = new DocumentPermissionChecker(user1, content, Some(course), "captionTrack")

      checker.canEnable(courseResource) shouldEqual false
    }

    "not allow global docs to a user who is not an owner or a teacher in a course" in {
      val content = Content(None, "", 'a, "", "")
      user1.cache.content = Some(Nil)
      val checker = new DocumentPermissionChecker(user1, content, Some(course), "captionTrack")

      checker.canEnable(globalResource) shouldEqual false
    }

    "allow global docs to a user who is an owner but not a teacher in a course" in {
      val content = Content(None, "", 'a, "", "")
      user1.cache.content = Some(List(content))
      val checker = new DocumentPermissionChecker(user1, content, Some(course), "captionTrack")

      checker.canEnable(globalResource) shouldEqual true
    }

    "not allow course docs to a user outside of a course" in {
      val content = Content(None, "", 'a, "", "")
      user1.cache.content = Some(Nil)
      val checker = new DocumentPermissionChecker(user1, content, None, "captionTrack")

      checker.canEnable(courseResource) shouldEqual false
    }

    "not allow global docs to a user who isn't an owner outside of a course" in {
      val content = Content(None, "", 'a, "", "")
      user1.cache.content = Some(Nil)
      val checker = new DocumentPermissionChecker(user1, content, None, "captionTrack")

      checker.canEnable(globalResource) shouldEqual false
    }

    "allow global docs to a user who is an owner outside of a course" in {
      val content = Content(None, "", 'a, "", "")
      user1.cache.content = Some(List(content))
      val checker = new DocumentPermissionChecker(user1, content, None, "captionTrack")

      checker.canEnable(globalResource) shouldEqual true
    }
  }
}