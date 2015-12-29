package controllers.ajax

import scala.concurrent._
import ExecutionContext.Implicits.global
import controllers.authentication.Authentication
import play.api.mvc.Controller
import models.{ActivityObject, PageContext, ActivityContext, Activity, Content}

/**
 * Used for saving activity stream events
 */
object ActivitySaver extends Controller {

  /**
   * The endpoint for saving an activity stream event.
   * Expected parameters
   * - pageCategory
   * - pageAction
   * - pageId
   * - generatorType
   * - generatorId
   * - generatorItemRef
   * - objectType
   * - objectId
   * - objectItemRef
   * - verb
   */
  def save = Authentication.authenticatedAction(parse.urlFormEncoded) {
    request =>
      user =>

        val data = request.body.mapValues(_(0))
        
        if (data("verb") == "pageLoad") Content.incrementViews(data("pageId").toLong)

        // Save the activity
        val activityContext = ActivityContext(
          PageContext(
            data("pageCategory"),
            data("pageAction"),
            data("pageId").toLong
          ),
          ActivityObject(
            data("generatorType"),
            data("generatorId"),
            data("generatorItemRef")
          )
        )
        val activityObject = ActivityObject(
          data("objectType"),
          data("objectId"),
          data("objectItemRef")
        )
        Activity(
          None,
          user.id.get,
          data("verb"),
          activityContext,
          activityObject
        ).save

        Future(Ok)
  }
}
