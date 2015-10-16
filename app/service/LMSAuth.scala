package service

import joshmonson.oauth.{OAuthKey, OAuthRequest}
import play.api.mvc.{AnyContent, Request}
import models.{Course, Content, User, SitePermissions}
import controllers.authentication._
import anorm.NotAssigned
import play.core.parsers.FormUrlEncodedParser

/**
 * This provides methods of authenticating from an LMS. These methods are:
 * <ul>
 * <li>LTI - The request is signed using OAuth 1a and contains student and LMS info.</li>
 * <li>Key - The key is included in the URL and the student is logged on using a guest account.</li>
 * </ul>
 * The key method is to be used in an LMS when it does not support LTI.
 */
object LMSAuth {

  /**
   * This tries to get the guest account for a course. If it doesn't exist
   * then it creates it and enrolls it in the course.
   * @param course The course for which the guest account is to be obtained.
   * @return The guest account
   */
  def getGuestAccount(course: Course): User = {
    User.findByAuthInfo(course.id.get.toString, 'keyAuth) match {
    case Some(user) => user
    case _ =>
      val user = User(NotAssigned, course.id.get.toString, 'keyAuth, "guest", Some("Guest")).save
        .enroll(course, teacher = false)
      SitePermissions.assignRole(user, 'student)
      //TODO: add course permissions
      user
    }
  }

  def getLTIUser(course: Option[Course] = None)(implicit request: Request[String]) = {
    val params = FormUrlEncodedParser
      .parse(request.body, request.charset.getOrElse("utf-8"))
      .mapValues(_(0))

    params.get("user_id").map { user_id =>  //Not used: params.get("user_image")
      val id = course.map(_.id.get + "." + user_id)
                     .getOrElse(user_id)

      User.findByAuthInfo(id, 'ltiAuth).getOrElse {
        val name = params.get("lis_person_name_full")
        val email = params.get("lis_person_contact_email_primary")
        val user = User(NotAssigned, id, 'ltiAuth, "user" + id, name, email).save
        SitePermissions.assignRole(user, 'student)
        if (course.isDefined) {  
          user.enroll(course.get, teacher = false)
          //TODO: add course permissions
        }
        user
      }
    }.orElse {
      val uopt = Authentication.getUserFromRequest()
      if (course.isDefined) { uopt.foreach(_.enroll(course.get, teacher = false)) }
      uopt
    }.orElse {
      course.map(c => getGuestAccount(c))
    }.map {
      user => user.copy(lastLogin = TimeTools.now()).save
    }
  }

  /**
   * Checks that the request is signed and valid for the given course. Returns, and creates if necessary,
   * a student user enrolled in that course.
   * @param course The course to view.
   * @param request The incoming web request. The body must be a string in order to verify it
   * @return Some(User) if the request is valid and signed. None otherwise
   */
  def ltiCourseAuth(course: Course)(implicit request: Request[String]): Option[User] = {
    // Verify the request. There is no token in LTI, so give an empty string
    val key = OAuthKey(course.id.get.toString, course.lmsKey, "", "")
    val oauthRequest = OAuthRequest(
      request.headers.get("Authentication"), request.headers.get("Content-Type"),
      request.host, request.rawQueryString, request.body, request.method, request.path
    )

    if (oauthRequest.verify(key)) {
      getLTIUser(Some(course))
    } else
      None
  }

  /**
   * Checks that the request is signed and valid for the given content. Returns, and creates if necessary, a student user
   * @param course The course to view.
   * @param request The incoming web request. The body must be a string in order to verify it
   * @return Some(User) if the request is valid and signed. None otherwise
   */
  def ltiContentAuth(content: Content)(implicit request: Request[String]): Option[User] = {
    // Verify the request. There is no token in LTI, so give an empty string
    val key = OAuthKey(content.id.get.toString, content.authKey, "", "")
    val oauthRequest = OAuthRequest(
      request.headers.get("Authentication"), request.headers.get("Content-Type"),
      request.host, request.rawQueryString, request.body, request.method, request.path
    )

    if (oauthRequest.verify(key)) {
      getLTIUser(None)
    } else
      None
  }

  /**
   * This simply checks the key to see if it matches. If it does it returns a guest account to that course.
   * @param course The course to view.
   * @param request The incoming web request.
   * @return Some(User) if the key matches that of the course. None otherwise
   */
  def keyAuth(course: Course)(implicit request: Request[AnyContent]): Option[User] = {

    // First check the key
    val key = request.queryString.get("key").map(_(0))
    if (key.isDefined && course.lmsKey == key.get) {

      // Now, get the guest account
      Some(getGuestAccount(course))
    } else
      None
  }
}
