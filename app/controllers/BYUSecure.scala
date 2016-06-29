package controllers

import authentication.Authentication
import play.api.mvc.Controller
import play.api.Play.{current, configuration}
import play.api.Logger
import java.net.URL
import java.security.MessageDigest
import java.security.NoSuchAlgorithmException
import javax.xml.bind.DatatypeConverter
import scala.concurrent.{Future, ExecutionContext}
import ExecutionContext.Implicits.global

/**
 * Controller for generating signed BYU URLs.
 */
object BYUSecure extends Controller {

  // These values are configurable and should be pulled from config.
  val lifespan = configuration.getLong("byusecure.lifetime").getOrElse[Long](28800)
  val sharedSecret = configuration.getString("byusecure.secret").getOrElse("SuperSecret")
  val parameterPrefix = configuration.getString("byusecure.prefix").getOrElse("byusecurelop")
  val algorithm = configuration.getString("byusecure.algorithm").getOrElse("SHA-256")
  val haship = configuration.getBoolean("byusecure.haship").getOrElse(false)

  def buildUrl = Authentication.authenticatedAction(parse.multipartFormData) {
    implicit request =>
	  implicit user =>
        val data = request.body.dataParts
        val url = new URL(data("url")(0))
        val path = url.getPath()

        // Set start time to five minutes ago to account for clock shifts, values in seconds
        val startTime = (System.currentTimeMillis() / 1000) - 300;
        val endTime = startTime + lifespan;

        val startParam = s"${parameterPrefix}starttime=$startTime"
        val endParam = s"${parameterPrefix}endtime=$endTime"
        val parameters = List[String](
          sharedSecret, startParam, endParam
        )

        val query = (if (haship) request.remoteAddress :: parameters else parameters)
                    .sorted
                    .mkString("&")

        // Strip off the manifest file and front slash from the path for hashing
	    val nameindex = path.lastIndexOf("/")
        val subpath = path.substring(1, if(nameindex > -1) nameindex else path.length)
        val input = s"${subpath}?${query}".getBytes("UTF-8")

        // Use DataTypeConverter instead of Base64 as Base64 library doesn't pad correctly.
        // But DataTypeConverter doesn't URL escape the strings, so URLify the result.
        val hash = DatatypeConverter.printBase64Binary(
                     MessageDigest.getInstance(algorithm).digest(input)
                   ).replace("+", "-").replace("/", "_");

        // Build non-secret values into url for validation on the otherside, along with the calculated hash.
        val response = url.getProtocol() + "://" +
                       url.getAuthority() +
                       path + "?" +
                       startParam + "&" +
                       endParam + "&" +
                       s"${parameterPrefix}hash=${hash}"
	  
	    Logger.debug("BYUSecure url: $url\nBYUSecure input: $input\nBYUSecure hash: $hash")
        Future(Ok(response))
  }
}
