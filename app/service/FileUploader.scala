package service

import java.io._
import play.api.Play
import play.api.Play.current
import concurrent.Future
import play.api.libs.Files.TemporaryFile
import play.api.mvc.MultipartFormData.FilePart
import java.util.Date
import java.awt.image.BufferedImage
import javax.imageio.ImageIO
import play.api.mvc.MultipartFormData.FilePart


trait UploadEngine {
  def upload(inputStream: InputStream, filename: String, contentLength: Long, contentType: String): Future[Option[String]]

  def upload(file: File, filename: String, contentType: String): Future[Option[String]] = {
    val contentLength = file.length()
    val inputStream = new FileInputStream(file)
    upload(inputStream, filename, contentLength, contentType)
  }
}

object FileUploader {

  private val uploadEngines = Map[String, UploadEngine](
    "s3" -> S3Uploader
  )

  val engine = uploadEngines(Play.configuration.getString("uploadEngine").get)

  def normalizeAndUploadFile(tempFile: FilePart[TemporaryFile]): Future[Option[String]] = {
    val file = tempFile.ref.file
    val filename = uniqueFilename(tempFile.filename)
    val contentType = tempFile.contentType.getOrElse("application/octet-stream")

    if (contentType.startsWith("image")) {
      // Do extra processing on images
      val normalizedImage = ImageTools.getNormalizedImageFromFile(file)
      uploadImage(normalizedImage, filename)
    } else
      uploadFile(file, filename, contentType)
  }

  def uniqueFilename(filename: String, ext: String = ""): String = {
    val unique = HashTools.md5Hex(filename + new Date().getTime)
    val extIndex = filename.lastIndexOf(".")
    unique + (
      if (extIndex < 0) ext
      else filename.substring(extIndex)
    )
  }

  def uploadFile(file: File, filename: String, contentType: String): Future[Option[String]] =
    engine.upload(file, filename, contentType)

  def uploadFile(tempFile: FilePart[TemporaryFile]): Future[Option[String]] = {
    val file = tempFile.ref.file
    val filename = uniqueFilename(tempFile.filename)
    val contentType = tempFile.contentType.getOrElse("application/octet-stream")
    uploadFile(file, filename, contentType)
  }

  def uploadStream(inputStream: InputStream, filename: String, contentLength: Long, contentType: String): Future[Option[String]] =
    engine.upload(inputStream, filename, contentLength, contentType)

  def uploadImage(image: BufferedImage, filename: String): Future[Option[String]] = {

    // Convert the BufferedImage to an input stream so we can upload it
    val outputStream = new ByteArrayOutputStream()

    // For now, always assume a jpeg
    ImageIO.write(image, "jpeg", outputStream)
    val inputStream = new ByteArrayInputStream(outputStream.toByteArray)
    uploadStream(inputStream, filename, outputStream.size(), "image/jpeg")
  }
}
