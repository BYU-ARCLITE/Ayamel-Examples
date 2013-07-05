package controllers

import play.api.mvc.Controller
import controllers.authentication.Authentication
import dataAccess.GoogleFormScripts
import scala.concurrent.ExecutionContext.Implicits.global

/**
 * Created with IntelliJ IDEA.
 * User: josh
 * Date: 7/5/13
 * Time: 10:40 AM
 * To change this template use File | Settings | File Templates.
 */
object QuestionSets extends Controller {

  def about(id: Long) = Authentication.authenticatedAction() {
    implicit request =>
      implicit user =>
        ContentController.getContent(id) {
          content =>
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

  def take(id: Long) = Authentication.authenticatedAction() {
    implicit request =>
      implicit user =>
        ContentController.getContent(id) {
          content =>
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

  def getIndex(id: Long) = Authentication.authenticatedAction() {
    implicit request =>
      implicit user =>
        ContentController.getContent(id) {
          content =>

            // Check the content type
            if (content.contentType == 'questions) {
              Async {
                GoogleFormScripts.getResponseIndex(content.resourceId).map(index => {
                  val origin = request.headers.get("Origin").getOrElse("*")
                  Ok(index.toString).withHeaders(
                    "Access-Control-Allow-Origin" -> origin,
                    "Access-Control-Allow-Credentials" -> "true"
                  )
                })
              }
            } else
              BadRequest
        }
  }

  def grade(id: Long, index: Int) = Authentication.authenticatedAction() {
    implicit request =>
      implicit user =>
        ContentController.getContent(id) {
          content =>
          // Check the content type
            if (content.contentType == 'questions) {
              // Check that the user can view the content
              if (content isVisibleBy user) {

                Async {
                  GoogleFormScripts.grade(content.resourceId, index).map(scoring => {
                    // Save the scoring
                    scoring.copy(userId = user.id.get, contentId = content.id.get).save
                    val score = scoring.percent
                    Redirect(routes.QuestionSets.about(id)).flashing("info" -> s"Your score was: $score%")
                  })
                }
              } else {
                Errors.forbidden
              }
            } else {
              Redirect(routes.ContentController.view(id))
            }
        }
  }

  def gradeAjax(id: Long, index: Int) = Authentication.authenticatedAction() {
    implicit request =>
      implicit user =>
        ContentController.getContent(id) {
          content =>
          // Check the content type
            if (content.contentType == 'questions) {
              // Check that the user can view the content
              if (content isVisibleBy user) {

                Async {
                  GoogleFormScripts.grade(content.resourceId, index).map(scoring => {
                    // Save the scoring
                    val newScoring = scoring.copy(userId = user.id.get, contentId = content.id.get).save
                    val origin = request.headers.get("Origin").getOrElse("*")
                    Ok(newScoring.toJson).withHeaders(
                      "Access-Control-Allow-Origin" -> origin,
                      "Access-Control-Allow-Credentials" -> "true"
                    )
                  })
                }
              } else {
                Forbidden
              }
            } else {
              BadRequest
            }
        }
  }
}
