import anorm.NotAssigned
import concurrent.{ExecutionContext, Await}
import concurrent.duration._
import io.Source
import logic.Resources
import models.{CaptionTrack, VideoGroup, Video}
import play.api.libs.ws.WS
import play.api.{Logger, GlobalSettings}
import ExecutionContext.Implicits.global

/**
 * Created with IntelliJ IDEA.
 * User: camman3d
 * Date: 2/20/13
 * Time: 2:02 PM
 * To change this template use File | Settings | File Templates.
 */
object Global extends GlobalSettings {

  /*
   * -----------------------------
   *       Fixture data
   * -----------------------------
   */

  // Video information
  val videoInfo = List(
    (Some("512cfb8935e544200c000002"), "Les Choristes", "http://arclite.byu.edu/hvmirror/French/LesChoristes.mp4", "The new teacher at a severely administered boys' boarding school works to positively effect the students' lives through music."),
    (Some("512cfb8b35e544210c000001"), "Dreyfus", "http://arclite.byu.edu/hvmirror/French/Dreyfus.mp4", "A music video about Dreyfus."),
    (Some("512cfb8c35e544240c000001"), "Les Enfants de Marais", "http://arclite.byu.edu/hvmirror/French/Enfantsmarais.mp4", "A chronicle of a group of friends in rural France in 1918. Garris and Riton live in Marais, a quiet region along the banks of Loire river. Riton is afflicted with a bad-tempered wife and three unruly children. Garris lives alone with his recollections of World War I trenches. Their daily life consists of seasonal work and visits from their two pals: Tane, the local train conductor and Amédée, a dreamer and voracious reader of classics."),
    (Some("512cfb8d35e544e50f000001"), "Monsieur Batignole", "http://arclite.byu.edu/hvmirror/French/MrBatignole.mp4", "In 1942, in an occupied Paris, the apolitical grocer Edmond Batignole lives with his wife and daughter in a small apartment in the building of his grocery. When his future son-in-law and collaborator of the German Pierre-Jean Lamour calls the Nazis to arrest the Jewish Bernstein family, they move to the confiscated apartment."),
    (Some("512cfb9035e544200c000003"), "Saint-Jacques... La Mecque", "http://arclite.byu.edu/hvmirror/French/St Jacques la Mecque.mp4", "Au décès de leur mère, deux frères et une soeur apprennent qu'ils ne toucheront leur héritage que s'ils font ensemble, à pied, la marche du Puy-en-Velay à Saint-Jacques-de-Compostelle. Mais ils se détestent autant qu'ils détestent la marche.")
  )

  // Thumbnails to videos
  val thumbnailInfo = List(
    ("512cfb8935e544200c000002", "http://ia.media-imdb.com/images/M/MV5BMTgyNTk5MDI1Ml5BMl5BanBnXkFtZTcwODc5NzcyMQ@@._V1_SY193_SX134_.jpg", "image/jpg", true),
    ("512cfb8d35e544e50f000001", "http://ia.media-imdb.com/images/M/MV5BMTYyNjk1NzgzM15BMl5BanBnXkFtZTYwODI0ODc5._V1_SY156_SX117_.jpg", "image/jpg", true),
    ("512cfb9035e544200c000003", "http://ia.media-imdb.com/images/M/MV5BMjAyNzk2OTIzMF5BMl5BanBnXkFtZTcwNjY5ODU4MQ@@._V1_SY317_CR5,0,214,317_.jpg", "image/jpg", true)
  )

  // Video groups
  val videoGroupInfo = List(
    ("French", List("Les Choristes", "Dreyfus", "Les Enfants de Marais", "Monsieur Batignole", "Saint-Jacques... La Mecque"))
  )

  // Caption Tracks
  val captionTrackInfo = List(
    ("Transcription", "fr", Some("512e6d6935e544230c000003"), "subtitles/Dreyfus-French.vtt", "Dreyfus"),
    ("Transcription", "fr", Some("512e70c935e544b412000000"), "subtitles/Les Enfants du Marais (French).vtt", "Les Enfants de Marais"),
    ("Translation", "en",   Some("512e70d535e544b612000000"), "subtitles/Les Enfants du Marais (English).vtt", "Les Enfants de Marais"),
    ("Transcription", "fr", Some("512e70d535e544210c000002"), "subtitles/LesChoristes (French).vtt", "Les Choristes"),
    ("Translation", "en",   Some("512e70d535e544230c000004"), "subtitles/LesChoristes (English).vtt", "Les Choristes"),
    ("Transcription", "fr", Some("512e70d635e544240c000002"), "subtitles/MrBatignoleFrench.vtt", "Monsieur Batignole"),
    ("Translation", "en",   Some("512e70d635e544b412000001"), "subtitles/MrBatignoleEnglish.vtt", "Monsieur Batignole"),
    ("Transcription", "fr", Some("512e70d735e544b612000001"), "subtitles/St Jacques la Mecque.vtt", "Saint-Jacques... La Mecque")
  )

  /*
   * -----------------------------
   *      On start method
   * -----------------------------
   */

  override def onStart(app: play.api.Application) {

    // Create fixtures
    createFixtures()
  }

  /*
   * -----------------------------
   *   Fixture loading functions
   * -----------------------------
   */

  def createFixtures() {
    loadVideos()
    loadVideoGroups()
    loadCaptionTracks()
  }

  def loadVideos() {
    // Create the videos
    if (Video.list.isEmpty) {
      for((resourceId, name, uri, description) <- videoInfo) {
        Logger.debug("Loading video: " + name)
        val id = resourceId.getOrElse(Resources.createVideoResource(name, description, uri))
        Video(NotAssigned, name, description, id, List()).save
      }

      // Add the thumbnails
      Logger.debug("Adding " + thumbnailInfo.size + " thumbnails.")
      thumbnailInfo.filterNot(_._4).foreach(info => {
        Resources.addThumbnail(info._1, info._2, Some(info._3))
      })
    }
  }

  def loadVideoGroups() {
    // Load the video groups
    if (VideoGroup.list.isEmpty) {
      for (videoGroup <- videoGroupInfo) {
        Logger.debug("Loading video group: " + videoGroup._1)
        VideoGroup(NotAssigned, videoGroup._1, videoGroup._2.map(name => Video.findByName(name).get)).save
      }
    }
  }

  def loadCaptionTracks() {
    // Load the caption tracks
    if (CaptionTrack.list.isEmpty) {
      for((name, language, resourceId, filename, videoName) <- captionTrackInfo) {
        Logger.info("Loading caption track: \"" + name + "\" for video: \"" + videoName + "\"")

        // Load the content from the remote file
        val content = Source.fromFile(filename, "UTF8").getLines().mkString("\r\n")

        // Create the caption track and optionally the resource
        var captionTrack = CaptionTrack(NotAssigned, name, language, "", content).save
        val id = resourceId.getOrElse(Resources.createCaptionTrackResource(captionTrack))
        captionTrack = captionTrack.copy(resourceId = id).save

        // Add the caption track to the video
        val video = Video.findByName(videoName).get
        video.copy(captionTracks = captionTrack :: video.captionTracks).save
      }
    }
  }
}
