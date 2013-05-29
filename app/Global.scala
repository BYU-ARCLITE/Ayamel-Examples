import models.{Setting, HelpPage, HomePageContent, User}
import play.api.mvc.RequestHeader
import play.api.{Logger, GlobalSettings}
import play.api.mvc.Results.InternalServerError
import service.EmailTools

object Global extends GlobalSettings {

  override def onStart(app: play.api.Application) {

    // If there are no users or courses then create all the fixtures
    if (User.list.isEmpty || models.Course.list.isEmpty) {
      Logger.info("Creating fixtures")
      Fixtures.create()
    }

    if (HomePageContent.list.isEmpty) {
      Fixtures.createHomePageContent()
    }

    if (HelpPage.list.isEmpty) {
      Fixtures.createHelpPages()
    }

    Fixtures.setupSetting()
  }

  override def onError(request: RequestHeader, ex: Throwable) = {
    EmailTools.sendAdminNotificationEmail("notifications.notifyOn.error", ex.toString)
    InternalServerError(views.html.application.error(request, ex))
  }

}
