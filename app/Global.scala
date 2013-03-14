import models.User
import play.api.{Logger, GlobalSettings}

object Global extends GlobalSettings {

  override def onStart(app: play.api.Application) {

    // If there are no users or classes then create all the fixtures
    if (User.list.isEmpty || models.Class.list.isEmpty) {
      Logger.info("Creating fixtures")
      Fixtures.create()
    }

  }

}
