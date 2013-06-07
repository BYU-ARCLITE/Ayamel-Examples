package service

import joshmonson.oauth.{OAuthKey, OAuthRequest}
import play.api.mvc.{AnyContent, Request}
import models.{Course, User}
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

  def getCourseUser(course: Course, userInfo: (Option[String], Option[String], Option[String])): User = {
    // Check that the user information was provided. If not, then give a guest account
    if (userInfo._2.isDefined) {
      val id = course.id.get + "." + userInfo._2.get
      val user = User.findByAuthInfo(id, 'ltiAuth)
      if (user.isDefined)
        user.get
      else
        User(NotAssigned, id, 'ltiAuth, "user" + id, userInfo._1, userInfo._3, User.roles.student).save
          .enroll(course, teacher = false)
    } else
      getGuestAccount(course)
  }

  /**
   * Checks that the request is signed and valid for the given course. Returns, and creates if necessary, a student user
   * enrolled in that course.
   * @param course The course to view.
   * @param request The incoming web request. The body must be a string in order to verify it
   * @return Some(User) if the request is valid and signed. None otherwise
   */
  def ltiAuth(course: Course)(implicit request: Request[String]): Option[User] = {

    // Verify the request. There is no token in LTI, so give an empty string
    val key = OAuthKey(course.id.get.toString, course.lmsKey, "", "")
    val oauthRequest = OAuthRequest(request.headers.get("Authentication"), request.headers.get("Content-Type"), request.host, request.rawQueryString, request.body, request.method, request.path)
    val valid = oauthRequest.verify(key)
    if (valid) {

      // Get the user info
      val params = FormUrlEncodedParser.parse(request.body, request.charset.getOrElse("utf-8")).mapValues(_(0))
      val userInfo = (params.get("lis_person_name_full"), params.get("user_id"), params.get("lis_person_contact_email_primary"))

      // Get the user based on the user info
      Some(getCourseUser(course, userInfo))
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

  /**
   * This tries to get the guest account for a course. If it doesn't exist then it creates it and enrolls it in the
   * course.
   * @param course The course for which the guest account is to be obtained.
   * @return The guest account
   */
  def getGuestAccount(course: Course): User = {
    val user = User.findByAuthInfo(course.id.get.toString, 'keyAuth)
    if (user.isDefined)
      user.get
    else
      User(NotAssigned, course.id.get.toString, 'keyAuth, "guest", Some("Guest"), role = User.roles.guest).save.enroll(course, teacher = false)
  }
}
