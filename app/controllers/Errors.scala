package controllers

import play.api.mvc.Results._

/**
 * Commonly used redirect errors.
 */
object Errors {
  val forbidden = Redirect(routes.Application.home()).flashing("error" -> "You cannot do that.")
  val notFound = Redirect(routes.Application.home()).flashing("error" -> "We couldn't find what you were looking for.")
}
