package controllers

import play.api.mvc.{Controller, Action}
import io.Source
import models.CaptionTrack

/**
 * Created with IntelliJ IDEA.
 * User: camman3d
 * Date: 2/26/13
 * Time: 4:56 PM
 * To change this template use File | Settings | File Templates.
 */
object CaptionTracks extends Controller {

  def view(id: Long) = Action {
    val captionTrack = CaptionTrack.findById(id).get
    Ok(captionTrack.content).as("text/vtt")
  }

}
