package controllers.ajax

import controllers.authentication.Authentication
import play.api.mvc.Controller
import models.{ActivityObject, PageContext, ActivityContext, Activity}
import anorm.NotAssigned

/**
 * Created with IntelliJ IDEA.
 * User: camman3d
 * Date: 4/23/13
 * Time: 3:43 PM
 * To change this template use File | Settings | File Templates.
 */
object ActivitySaver extends Controller {

  def save = Authentication.authenticatedAction(parse.urlFormEncoded) {
    request =>
      user =>

        val data = request.body.mapValues(_(0))

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
          NotAssigned,
          user.id.get,
          data("verb"),
          activityContext,
          activityObject
        ).save

        Ok
  }
}
