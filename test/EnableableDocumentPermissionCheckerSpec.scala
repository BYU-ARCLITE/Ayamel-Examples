import anorm.{Id, NotAssigned}
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

  val user1 = User(Id(5), "", 'a, "")

  val user2 = User(Id(5), "", 'a, "", role = User.roles.admin)

  val course = Course(Id(8), "", "", "")
  course.cache.teachers = Some(Nil)

  "The enableable document permission checker" should {

    "allow personal documents" in {
      val content = Content(NotAssigned, "", 'a, "", "")
      val checker = new DocumentPermissionChecker(user1, content, None, DocumentPermissionChecker.documentTypes.captionTrack)

      checker.canEnable(personalResource) shouldEqual true
    }

    "allow course docs to a teacher in a course" in {
      val content = Content(NotAssigned, "", 'a, "", "")
      val checker = new DocumentPermissionChecker(user2, content, Some(course), DocumentPermissionChecker.documentTypes.captionTrack)

      checker.canEnable(courseResource) shouldEqual true
    }

    "not allow disabled global docs to a teacher in a course" in {
      val content1 = Content(NotAssigned, "", 'a, "", "")
      val content2 = Content(NotAssigned, "", 'a, "", "", settings = Map("enabledCaptionTracks" -> "asdf,qwer-234"))
      val checker1 = new DocumentPermissionChecker(user2, content1, Some(course), DocumentPermissionChecker.documentTypes.captionTrack)
      val checker2 = new DocumentPermissionChecker(user2, content2, Some(course), DocumentPermissionChecker.documentTypes.captionTrack)

      checker1.canEnable(globalResource) shouldEqual false
      checker2.canEnable(globalResource) shouldEqual false
    }

    "allow enabled global docs to a teacher in a course" in {
      val content = Content(NotAssigned, "", 'a, "", "", settings = Map("enabledCaptionTracks" -> "asdf,josh3,qwer-234"))
      val checker = new DocumentPermissionChecker(user2, content, Some(course), DocumentPermissionChecker.documentTypes.captionTrack)

      checker.canEnable(globalResource) shouldEqual true
    }

    "not allow course docs to a user who is not a teacher in a course" in {
      val content = Content(NotAssigned, "", 'a, "", "")
      val checker = new DocumentPermissionChecker(user1, content, Some(course), DocumentPermissionChecker.documentTypes.captionTrack)

      checker.canEnable(courseResource) shouldEqual false
    }

    "not allow global docs to a user who is not an owner or a teacher in a course" in {
      val content = Content(NotAssigned, "", 'a, "", "")
      user1.cache.content = Some(Nil)
      val checker = new DocumentPermissionChecker(user1, content, Some(course), DocumentPermissionChecker.documentTypes.captionTrack)

      checker.canEnable(globalResource) shouldEqual false
    }

    "allow global docs to a user who is an owner but not a teacher in a course" in {
      val content = Content(NotAssigned, "", 'a, "", "")
      user1.cache.content = Some(List(content))
      val checker = new DocumentPermissionChecker(user1, content, Some(course), DocumentPermissionChecker.documentTypes.captionTrack)

      checker.canEnable(globalResource) shouldEqual true
    }

    "not allow course docs to a user outside of a course" in {
      val content = Content(NotAssigned, "", 'a, "", "")
      user1.cache.content = Some(Nil)
      val checker = new DocumentPermissionChecker(user1, content, None, DocumentPermissionChecker.documentTypes.captionTrack)

      checker.canEnable(courseResource) shouldEqual false
    }

    "not allow global docs to a user who isn't an owner outside of a course" in {
      val content = Content(NotAssigned, "", 'a, "", "")
      user1.cache.content = Some(Nil)
      val checker = new DocumentPermissionChecker(user1, content, None, DocumentPermissionChecker.documentTypes.captionTrack)

      checker.canEnable(globalResource) shouldEqual false
    }

    "allow global docs to a user who is an owner outside of a course" in {
      val content = Content(NotAssigned, "", 'a, "", "")
      user1.cache.content = Some(List(content))
      val checker = new DocumentPermissionChecker(user1, content, None, DocumentPermissionChecker.documentTypes.captionTrack)

      checker.canEnable(globalResource) shouldEqual true
    }
  }
}