package service

import concurrent.{ExecutionContext, Future}
import ExecutionContext.Implicits.global
import play.api.{Logger, Play}
import play.api.Play.current
import java.io.File
import javax.imageio.ImageIO

/**
 * Created with IntelliJ IDEA.
 * User: camman3d
 * Date: 4/3/13
 * Time: 9:32 AM
 * To change this template use File | Settings | File Templates.
 */
object VideoTools {

  private val thumbnailTime = Play.configuration.getDouble("media.video.thumbnailTime").get
  private val ffmpeg = Play.configuration.getString("media.video.ffmpeg").get
  private val ffmpegExists = new File(ffmpeg).exists()

  def getTimeCodeFromSeconds(time: Double): String = {
    val seconds = Math.floor((time % 60) * 100) / 100
    val minutes = (Math.floor(time / 60) % 60).toInt
    val hours = Math.floor(time / 3600).toInt
    s"$hours:$minutes:$seconds"
  }

  /**
   * Create a thumbnail from a video.
   * We use FFMPEG to get an image from the video, turn it into a thumbnail, and upload it
   * The command is of the following form
   * ffmpeg -ss {timeCode} -i {video} -f image2 -vframes 1 {outfile}
   * @param videoUrl The URL of the video
   * @param time The time, in seconds, of the frame to retrieve. Defaults to the time defined in the conf file.
   * @return A future containing the URL of the thumbnail
   */
  def generateThumbnail(videoUrl: String, time: Double = thumbnailTime): Future[Option[String]] = {
    // Check that we are able to get the video
    if (ffmpegExists && ResourceHelper.isHTTP(videoUrl)) {

      try {
        // Make a unique file to save the image to
        val filename = "/tmp/" + FileUploader.uniqueFilename("out.jpg")
        val file = new File(filename)

        // Execute ffmpeg to get the frame and wait for it to finish
        val timeCode = getTimeCodeFromSeconds(time)
        val command = s"$ffmpeg -ss $timeCode -i $videoUrl -f image2 -vframes 1 $filename"
        Logger.debug(s"Command: $command")
        val process = Runtime.getRuntime.exec(command)
        process.waitFor()

        // Now process the image and upload it
        val image = ImageIO.read(file)
        file.delete()
        ImageTools.makeThumbnail(image) match {
          case Some(thumbnail) =>
            FileUploader.uploadImage(thumbnail, FileUploader.uniqueFilename("thumbnail.jpg"))
          case None => Future(None)
        }
      } catch {
        case _: Throwable => Future(None)
      }
    } else
      Future(None)
  }

}
