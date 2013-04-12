package controllers

import authentication.Authentication
import play.api.mvc._
import models.{Content, Course}
import javax.imageio.ImageIO
import java.io.File
import service.{ResourceHelper, ImageTools}
import scala.concurrent.ExecutionContext
import ExecutionContext.Implicits.global
import play.api.libs.json.Json

object Application extends Controller {

  def index = Action {
    implicit request =>
      val user = Authentication.getUserFromRequest()
      if (user.isDefined)
        Redirect(controllers.routes.Application.home()).withSession("userId" -> user.get.id.get.toString)
      else
        Ok(views.html.application.index())
  }

  def home = Authentication.authenticatedAction() {
    implicit request =>
      implicit user =>
        Ok(views.html.application.home())
  }

  def test = Action {
    request =>

//      val image = ImageIO.read(new File("C:\\Users\\Public\\Pictures\\Sample Pictures\\Koala.jpg"))
//      val newImage = ImageTools.rotate(image, 3)
////      val newImage = ImageTools.crop(image, 0.1, 0.1, 0.9, 0.9)
//      ImageIO.write(newImage, "jpeg", new File("c:\\tmp\\image.jpg"))
//      Ok

//      val file = request.body.file("file").get
//      val ext = file.filename.substring(file.filename.lastIndexOf(".") + 1)

      val m = Map(
        "one" -> "two",
        "three" -> "4"
      )
      val json = Json.toJson(m)


      Ok(json)


//      Async {
//
//        // https://s3.amazonaws.com/ayamel/29db4d75976d9b1d131e7b2f01571682.JPG
//        ResourceHelper.updateDownloadUri("41b2aaa9-0984-907a-1d10-a1875721fa07", "https://s3.amazonaws.com/ayamel/29db4d75976d9b1d131e7b2f01571682.JPG").map(r => Ok("Done"))
//      }


    //      Async {
    //
    //        val content = SerializationTools.serializeMap(Map(
    //          "status" -> "ok",
    //          "contentId" -> "38",
    //          "advanceMethod" -> "time",
    //          "advanceTime" -> "5"
    //        ))
    //        PlayGraph.Author.NodeContent.update(10, content).map(json => Ok(json))
    //
    ////        VideoTools.generateThumbnail("http://arclite.byu.edu/hvmirror/french/Dreyfus.mp4").map(url => {
    ////          Ok(url)
    ////        })
    //
    //
    //
    ////        Ok(Content.findById(35).toString)
    //
    ////        PlayGraph.Player.update(4).map(json =>
    ////          Ok(json)
    ////        )
    //      }
  }

  def search = Authentication.authenticatedAction() {
    implicit request =>
      implicit user =>

      // Search each applicable model
        val query = request.queryString("query")(0)
        val courses = Course.search(query)
        val content = Content.search(query)

        Ok(views.html.application.search(content, courses))
  }

  def about = Authentication.authenticatedAction() {
    implicit request =>
      implicit user =>

        Ok(views.html.application.about())
  }

  def terms = Authentication.authenticatedAction() {
    implicit request =>
      implicit user =>

        Ok(views.html.application.terms())
  }

  def policy = Authentication.authenticatedAction() {
    implicit request =>
      implicit user =>

        Ok(views.html.application.policy())
  }

}