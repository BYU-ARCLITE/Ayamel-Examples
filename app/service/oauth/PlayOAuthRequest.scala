package service.oauth

import com.twitter.joauth.Request

/**
 * This is a wrapper for turning play requests into joauth requests.
 * @param _authHeader The Authorization header
 * @param _body The body as a string
 * @param _contentType The ContentType of the body
 * @param _host The host header, without the port
 * @param _method The HTTP method
 * @param _path The path (rest of the url after the host)
 * @param _port The port of the request
 * @param _queryString The query string
 * @param _scheme The HTTP scheme. Most likely "http"
 */
case class PlayOAuthRequest(
    _authHeader: Option[String],
    _body: String,
    _contentType: Option[String],
    _host: String,
    _method: String,
    _path: String,
    _port: Int,
    _queryString: String,
    _scheme: String) extends Request {

  def authHeader = _authHeader
  def body = _body
  def contentType = _contentType
  def host = _host
  def method = _method
  def path = _path
  def port = _port
  def queryString = _queryString
  def scheme = _scheme
}
