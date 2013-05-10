package service

import play.api.mvc.RequestHeader

/**
 * Created with IntelliJ IDEA.
 * User: camman3d
 * Date: 5/10/13
 * Time: 12:04 PM
 * To change this template use File | Settings | File Templates.
 */
object MobileDetection {

  private val mobilePattern = ".*(android|avantgo|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od|ad)|iris|kindle|lge |maemo|midp|mmp|netfront|opera m(ob|in)i|palm( os)?|phone|plucker|pocket|psp|series(4|6)0|symbian|treo|vodafone|wap|windows (ce|phone)|xda|xiino).*"

  def isMobile()(implicit request: RequestHeader): Boolean =
    request.headers.get("User-Agent").getOrElse("").toLowerCase().matches(mobilePattern)
}
