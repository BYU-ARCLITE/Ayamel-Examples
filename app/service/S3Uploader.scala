package service

import java.io.InputStream
import concurrent.{ExecutionContext, Future}
import ExecutionContext.Implicits.global
import play.api.Play
import play.api.Logger
import com.amazonaws.auth.AWSCredentials
import com.amazonaws.services.s3.AmazonS3Client
import com.amazonaws.services.s3.model.{CannedAccessControlList, ObjectMetadata}
import com.amazonaws.{AmazonClientException, AmazonServiceException}
import play.api.Play.current

/**
 * Created with IntelliJ IDEA.
 * User: camman3d
 * Date: 4/2/13
 * Time: 12:59 PM
 * To change this template use File | Settings | File Templates.
 */
object S3Uploader extends UploadEngine {
  override def upload(inputStream: InputStream, filename: String, contentLength: Long, contentType: String): Future[String] = {

    // Set up the connection
    val s3Client = new AmazonS3Client(new AWSCredentials {
      def getAWSAccessKeyId = Play.application.configuration.getString("amazon.accessKeyId").get

      def getAWSSecretKey = Play.application.configuration.getString("amazon.secretAccessKey").get
    })
    val bucket = Play.application.configuration.getString("amazon.bucket").get

    // Create information about the item we're uploading
    val metadata = new ObjectMetadata()
    metadata.setContentType(contentType)
    metadata.setContentLength(contentLength)

    // Upload the file and return the URL to it
    Future {
      try {
        s3Client.putObject(bucket, filename, inputStream, metadata)
        s3Client.setObjectAcl(bucket, filename, CannedAccessControlList.PublicRead)
        inputStream.close()

        // Return the URL
        "https://s3.amazonaws.com/" + bucket + "/" + filename
      } catch {
        case e:AmazonClientException =>
          Logger.debug("Amazon Client Exception: " + e.getMessage())
          throw e
        case e:AmazonServiceException =>
          Logger.debug("Amazon Service Exception: " + e.getMessage())
          throw e
      }
    }
  }
}
