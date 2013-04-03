package service

import java.awt.image.BufferedImage
import java.awt.{RenderingHints, Graphics2D, Color}
import concurrent.Future
import javax.imageio.ImageIO
import java.net.URL
import java.io.File
import play.api.Play
import play.api.Play.current

/**
 * Created with IntelliJ IDEA.
 * User: camman3d
 * Date: 4/3/13
 * Time: 10:37 AM
 * To change this template use File | Settings | File Templates.
 */
object ImageTools {

  def scaleImage(image: BufferedImage, width: Int, height: Int, background: Color): BufferedImage = {
    // Maintain aspect ratio
    var newWidth = width
    var newHeight = height
    val imgWidth = image.getWidth
    val imgHeight = image.getHeight
    if (imgWidth*height < imgHeight*width) {
      newWidth = imgWidth*height/imgHeight
    } else {
      newHeight = imgHeight*width/imgWidth
    }

    // Write the image to a new image of a different size
    val newImage = new BufferedImage(newWidth, newHeight, BufferedImage.TYPE_INT_RGB)
    val graphics = newImage.createGraphics()
    try {
      graphics.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BICUBIC)
      graphics.setBackground(background)
      graphics.clearRect(0, 0, newWidth, newHeight)
      graphics.drawImage(image, 0, 0, newWidth, newHeight, null)
    } finally {
      graphics.dispose()
    }
    newImage
  }

  def makeThumbnail(image: BufferedImage): BufferedImage = scaleImage(image, 250, 250, Color.black)

  def generateThumbnail(url: String): Future[String] = {
    val image = makeThumbnail(
      ImageIO.read(new URL(url))
    )
    val filename = FileUploader.uniqueFilename(url + ".jpg")
    FileUploader.uploadImage(image, filename)
  }

  def getNormalizedImageFromFile(file: File): BufferedImage = {
    val image = ImageIO.read(file)
    val width = math.min(image.getWidth, Play.configuration.getInt("media.image.maxWidth").get)
    val height = math.min(image.getHeight, Play.configuration.getInt("media.image.maxHeight").get)
    scaleImage(image, width, height, Color.black)
  }
}
