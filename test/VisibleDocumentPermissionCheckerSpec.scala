import anorm.{Id, NotAssigned}
import models.{Content, User, Course}
import org.specs2.mutable._

import play.api.libs.json.Json
import play.api.test._
import play.api.test.Helpers._
import service.DocumentPermissionChecker

/**
 * Tests all the methods in the course model
 */
class VisibleDocumentPermissionCheckerSpec extends Specification {

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

  val user = User(Id(5), "", 'a, "")

  val course = Course(Id(8), "", "", "")

  "The visible document permission checker" should {

    "not allow disabled personal documents" in {
      val content1 = Content(NotAssigned, "", 'a, "", "")
      val content2 = Content(NotAssigned, "", 'a, "", "", settings = Map("user_5:enabledCaptionTracks" -> "asdf,qwer-234"))

      val checker1 = new DocumentPermissionChecker(user, content1, None, DocumentPermissionChecker.documentTypes.captionTrack)
      val checker2 = new DocumentPermissionChecker(user, content2, None, DocumentPermissionChecker.documentTypes.captionTrack)

      checker1.canView(personalResource) shouldEqual false
      checker2.canView(personalResource) shouldEqual false
    }

    "allow enabled personal documents" in {
      val content = Content(NotAssigned, "", 'a, "", "", settings = Map("user_5:enabledCaptionTracks" -> "asdf,josh1,qwer-234"))
      val checker = new DocumentPermissionChecker(user, content, None, DocumentPermissionChecker.documentTypes.captionTrack)

      checker.canView(personalResource) shouldEqual true
    }

    "not allow disabled course documents" in {
      val content1 = Content(NotAssigned, "", 'a, "", "")
      val content2 = Content(NotAssigned, "", 'a, "", "", settings = Map("course_8:enabledCaptionTracks" -> "asdf,qwer-234"))

      val checker1 = new DocumentPermissionChecker(user, content1, Some(course), DocumentPermissionChecker.documentTypes.captionTrack)
      val checker2 = new DocumentPermissionChecker(user, content2, Some(course), DocumentPermissionChecker.documentTypes.captionTrack)

      checker1.canView(courseResource) shouldEqual false
      checker2.canView(courseResource) shouldEqual false
    }

    "allow enabled course documents" in {
      val content = Content(NotAssigned, "", 'a, "", "", settings = Map("course_8:enabledCaptionTracks" -> "asdf,josh2,qwer-234"))
      val checker = new DocumentPermissionChecker(user, content, Some(course), DocumentPermissionChecker.documentTypes.captionTrack)

      checker.canView(courseResource) shouldEqual true
    }

    "not allow disabled global documents in course" in {
      val content1 = Content(NotAssigned, "", 'a, "", "")
      val content2 = Content(NotAssigned, "", 'a, "", "", settings = Map(
        "enabledCaptionTracks" -> "josh3"
      ))
      val content3 = Content(NotAssigned, "", 'a, "", "", settings = Map(
        "enabledCaptionTracks" -> "josh3",
        "course_8:enabledCaptionTracks" -> "asdf,qwer-234"
      ))

      val checker1 = new DocumentPermissionChecker(user, content1, Some(course), DocumentPermissionChecker.documentTypes.captionTrack)
      val checker2 = new DocumentPermissionChecker(user, content2, Some(course), DocumentPermissionChecker.documentTypes.captionTrack)
      val checker3 = new DocumentPermissionChecker(user, content3, Some(course), DocumentPermissionChecker.documentTypes.captionTrack)

      checker1.canView(globalResource) shouldEqual false
      checker2.canView(globalResource) shouldEqual false
      checker3.canView(globalResource) shouldEqual false
    }

    "allow enabled global documents in course" in {
      val content = Content(NotAssigned, "", 'a, "", "", settings = Map("course_8:enabledCaptionTracks" -> "asdf,josh3,qwer-234"))
      val checker = new DocumentPermissionChecker(user, content, Some(course), DocumentPermissionChecker.documentTypes.captionTrack)

      checker.canView(globalResource) shouldEqual true
    }

    "not allow disabled global documents" in {
      val content1 = Content(NotAssigned, "", 'a, "", "")
      val content2 = Content(NotAssigned, "", 'a, "", "", settings = Map("enabledCaptionTracks" -> "asdf,qwer-234"))

      val checker1 = new DocumentPermissionChecker(user, content1, None, DocumentPermissionChecker.documentTypes.captionTrack)
      val checker2 = new DocumentPermissionChecker(user, content2, None, DocumentPermissionChecker.documentTypes.captionTrack)

      checker1.canView(globalResource) shouldEqual false
      checker2.canView(globalResource) shouldEqual false
    }

    "allow enabled global documents" in {
      val content = Content(NotAssigned, "", 'a, "", "", settings = Map("enabledCaptionTracks" -> "asdf,josh3,qwer-234"))
      val checker = new DocumentPermissionChecker(user, content, None, DocumentPermissionChecker.documentTypes.captionTrack)

      checker.canView(globalResource) shouldEqual true
    }
  }
}