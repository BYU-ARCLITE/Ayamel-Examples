package service.oauth

import com.twitter.joauth._
import com.twitter.joauth.Request
import play.api.mvc._
import service.oauth.PlayOAuthRequest
import play.api.libs.ws.WS.WSRequest

/**
 * This contains helpers for verifying play requests
 */
object PlayOAuth {

  object helpers {
    type PlayRequest = play.api.mvc.Request[String]

    /**
     * Converts a play request into a joauth request
     * @param request The play framework request
     * @return The joauth request
     */
    implicit def playRequestToPlayOAuthRequest(request: PlayRequest): PlayOAuthRequest = {

      val host = request.host.split(":")(0)
      val port =
        if (request.host.contains(":"))
          request.host.split(":")(1).toInt
        else
          80

      PlayOAuthRequest(
        request.headers.get("Authorization"),
        request.body,
        request.headers.get("Content-Type"),
        host,
        request.method,
        request.path,
        port,
        request.rawQueryString,
        "http"
      )
    }

    /**
     * Verifies an OAuth1Request using joauth
     * @param request The OAuth1Request
     * @param tokenSecret The token secret, can be an empty string
     * @param consumerSecret The consumer secret
     * @return True if valid, false otherwise
     */
    def verifyOAuth1(request: OAuth1Request, tokenSecret: String, consumerSecret: String): Boolean = {
      val verify = Verifier()
      verify(request, tokenSecret, consumerSecret) match {
        case VerifierResult.OK => true
        case _ => false
      }
    }

    /**
     * Verifies a request using joauth.
     * @param request The joauth request
     * @param tokenSecret The token secret, can be an empty string
     * @param consumerSecret The consumer secret
     * @return True if a valid oauth 1 signed request, false otherwise
     */
    def verify(request: Request, tokenSecret: String, consumerSecret: String): Boolean = {
      val unpack = Unpacker()
      unpack(request) match {
        case req: OAuth1Request => verifyOAuth1(req, tokenSecret, consumerSecret)
        case _ => false
      }
    }
  }

  /**
   * Verifies the play request by transforming it into a joauth request and verifying that
   * @param request The incoming Play Framework request
   * @param tokenSecret The token secret, can be an empty string
   * @param consumerSecret The consumer secret
   * @return True if valid, false otherwise
   */
  def verify(request: helpers.PlayRequest, tokenSecret: String, consumerSecret: String): Boolean =
    helpers.verify(helpers.playRequestToPlayOAuthRequest(request), tokenSecret, consumerSecret)

}
