package service

import com.xuggle.mediatool.{MediaListenerAdapter, ToolFactory}
import java.awt.image.BufferedImage
import com.xuggle.mediatool.event.IVideoPictureEvent
import com.xuggle.xuggler.Global
import concurrent.{ExecutionContext, Future}
import ExecutionContext.Implicits.global
import play.api.Play
import play.api.Play.current

/**
 * Created with IntelliJ IDEA.
 * User: camman3d
 * Date: 4/3/13
 * Time: 9:32 AM
 * To change this template use File | Settings | File Templates.
 */
object VideoTools {

  private val secondsBetweenFrames = Play.configuration.getInt("media.video.thumbnailTime").get
  private val microSecondsBetweenFrames = Global.DEFAULT_PTS_PER_SECOND * secondsBetweenFrames

  private var mVideoStreamIndex = -1
  private var mLastPtsWrite = Global.NO_PTS


  private class ImageSnapListener(filename: String) extends MediaListenerAdapter {
    var imageGrabbed = false
    var futureUrl: Future[String] = null

    override def onVideoPicture(event: IVideoPictureEvent) {
      if (!imageGrabbed && (event.getStreamIndex == mVideoStreamIndex || mVideoStreamIndex == -1)) {
        // Set the video stream index
        mVideoStreamIndex = event.getStreamIndex

        // if uninitialized, back date mLastPtsWrite to get the very first frame
        if (mLastPtsWrite == Global.NO_PTS)
          mLastPtsWrite = event.getTimeStamp - microSecondsBetweenFrames

        // if it's time to write the next frame
        if (event.getTimeStamp - mLastPtsWrite >= microSecondsBetweenFrames) {

          // Grab image and upload it
          val image = ImageTools.makeThumbnail(event.getImage)
          futureUrl = FileUploader.uploadImage(image, filename)

          imageGrabbed = true
        }
      }
    }
  }

  def generateThumbnail(videoUrl: String): Future[String] = {
    Future {
//      val reader = ToolFactory.makeReader(videoUrl)
//
//      // stipulate that we want BufferedImages created in BGR 24bit color space
//      reader.setBufferedImageTypeToGenerate(BufferedImage.TYPE_3BYTE_BGR)
//
//      // Add the image grabber
//      val filename = FileUploader.uniqueFilename(videoUrl + ".jpg")
//      val isListener = new ImageSnapListener(filename)
//      reader.addListener(isListener)
//
//      // Read packets until we get a thumbnail
//      while (!isListener.imageGrabbed)
//        reader.readPacket()
//
//      reader.close()
//      isListener.futureUrl
      ""
    }//.flatMap(_.map(s => s)) // Combine the futures
  }

}
