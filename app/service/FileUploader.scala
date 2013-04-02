package service

import java.io.File
import play.api.Play
import play.api.Play.current
import concurrent.Future
import play.api.libs.Files.TemporaryFile
import play.api.mvc.MultipartFormData.FilePart
import java.util.Date


abstract class UploadEngine {
  def upload(file: File, filename: String, contentType: String): Future[String]
}

object FileUploader {

  private val uploadEngines = Map[String, UploadEngine](
    "s3" -> S3Uploader
  )

  def uniqueFilename(filename: String): String = {
    val extension = filename.substring(filename.lastIndexOf("."))
    val unique = HashTools.md5Hex(filename + new Date().getTime)
    unique + extension
  }

  def uploadFile(file: File, filename: String, contentType: String): Future[String] = {
    val engine = Play.configuration.getString("uploadEngine").get
    uploadEngines(engine).upload(file, filename, contentType)
  }

  def uploadFile(tempFile: FilePart[TemporaryFile]): Future[String] = {
    val file = tempFile.ref.file
    val filename = uniqueFilename(tempFile.filename)
    val contentType = tempFile.contentType.getOrElse("application/octet-stream")
    uploadFile(file, filename, contentType)
  }
}
