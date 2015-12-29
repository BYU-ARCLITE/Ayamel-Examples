package controllers

import scala.concurrent._
import ExecutionContext.Implicits.global
import play.api.mvc.Controller
import controllers.authentication.Authentication
import dataAccess.GoogleFormScripts

/**
 * Controller dealing with question sets
 */
object QuestionSets extends Controller {

  /**
   * The about page. View information/description of the question set
   * @param id The ID of the question set
   */
  def about(id: Long) = Authentication.authenticatedAction() {
    implicit request =>
      implicit user =>
        ContentController.getContent(id) { content =>
          Future {
            // Check the content type
            if (content.contentType == 'questions) {
              // Check that the user can view the content
              if (content isVisibleBy user) {
                Ok(views.html.questionSets.about(content))
              } else {
                Errors.forbidden
              }
            } else {
              Redirect(routes.ContentController.view(id))
            }
          }
        }
  }

  /**
   * Take, or fill out, the question set.
   * @param id The ID of the question set
   */
  def take(id: Long) = Authentication.authenticatedAction() {
    implicit request =>
      implicit user =>
        ContentController.getContent(id) { content =>
          Future {
            // Check the content type
            if (content.contentType == 'questions) {
            // Check that the user can view the content
              if (content isVisibleBy user) {
                Ok(views.html.questionSets.take(content))
              } else {
                Errors.forbidden
              }
            } else {
              Redirect(routes.ContentController.view(id))
            }
          }
        }
  }

  /**
   * When a user is taking a question set, we need to know what index their response will be so we can grade it.
   * This finds that index and returns it. For AJAX calls.
   * @param id The ID of the question set
   */
  def getIndex(id: Long) = Authentication.authenticatedAction() {
    implicit request =>
      implicit user =>
        ContentController.getContent(id) { content =>
          // Check the content type
          if (content.contentType == 'questions) {
            GoogleFormScripts.getResponseIndex(content.resourceId).map { index =>
              val origin = request.headers.get("Origin").getOrElse("*")
              Ok(index.toString).withHeaders(
                "Access-Control-Allow-Origin" -> origin,
                "Access-Control-Allow-Credentials" -> "true"
              )
            }
          } else
            Future(BadRequest)
        }
  }

  /**
   * This grades a response to a question set.
   * @param id The ID of the question set
   * @param index The response index
   */
  def grade(id: Long, index: Int) = Authentication.authenticatedAction() {
    implicit request =>
      implicit user =>
        ContentController.getContent(id) { content =>
          // Check the content type
          if (content.contentType == 'questions) {
            // Check that the user can view the content
            if (content isVisibleBy user) {
              GoogleFormScripts.grade(content.resourceId, index).map { scoring =>
                // Save the scoring
                scoring.copy(userId = user.id.get, contentId = content.id.get).save
                val score = scoring.percent
                Redirect(routes.QuestionSets.about(id)).flashing("info" -> s"Your score was: $score%")
              }
            } else {
              Future(Errors.forbidden)
            }
          } else {
            Future(Redirect(routes.ContentController.view(id)))
          }
        }
  }

  /**
   * This grades a response to a question set. For AJAX calls
   * @param id The ID of the question set
   * @param index The response index
   */
  def gradeAjax(id: Long, index: Int) = Authentication.authenticatedAction() {
    implicit request =>
      implicit user =>
        ContentController.getContent(id) { content =>
          // Check the content type
          if (content.contentType == 'questions) {
            // Check that the user can view the content
            if (content isVisibleBy user) {
              GoogleFormScripts.grade(content.resourceId, index).map { scoring =>
                // Save the scoring
                val newScoring = scoring.copy(userId = user.id.get, contentId = content.id.get).save
                val origin = request.headers.get("Origin").getOrElse("*")
                Ok(newScoring.toJson).withHeaders(
                  "Access-Control-Allow-Origin" -> origin,
                  "Access-Control-Allow-Credentials" -> "true"
                )
              }
            } else {
              Future(Forbidden)
            }
          } else {
            Future(BadRequest)
          }
        }
  }
}
