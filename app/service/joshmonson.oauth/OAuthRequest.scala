package service.joshmonson.oauth

import com.google.gdata.client.authn.oauth.OAuthUtil
import scala.collection.JavaConversions._

/**
 * Represents a HTTP request and offers functionality for generating and verifying OAuth 1.0a signatures including the
 * optional extension oauth_body_hash.
 *
 * @param authorizationHeader The authorization header. Needed only for validation
 * @param contentTypeHeader The content type header. Needed only for POST or PUT requests
 * @param host The host (from headers)
 * @param queryString The query string as a String
 * @param body The body as a String. Leave as empty string for GET, HEAD, DELETE, and OPTIONS requests
 * @param method The HTTP method
 * @param path The path from the request URL
 */
case class OAuthRequest(
  // Information taken from headers
  authorizationHeader: Option[String],
  contentTypeHeader: Option[String],
  host: String,

  // Content information
  queryString: String,
  body: String,

  // URL information
  method: String,
  path: String
) {

  /**
   * Computes and returns the Authorization header for this request
   * @param key An OAuthKey object containing the consumer and token
   * @return The authorization header
   */
  def getAuthorizationHeader(implicit key: OAuthKey): String = getSignaturePackage._2

  /**
   * Computes and returns the signature for this request
   * @param key An OAuthKey object containing the consumer and token
   * @return The signature
   */
  def getSignature(implicit key: OAuthKey): String = getSignaturePackage._1

  /**
   * Verifies that this request was signed with the given key
   * @param key An OAuthKey object containing the consumer and token
   * @return True if the request is valid with the given key. False otherwise
   */
  def verify(implicit key: OAuthKey): Boolean = {
    val signaturePackage = getSignaturePackage
    signaturePackage._5.isDefined && signaturePackage._1 == signaturePackage._5.get
  }

  /**
   * Cache the signature package because it may needed more than once
   * The following are the items:
   * _1: Signature
   * _2: Authorization header
   * _3: Base String
   * _4: All parameters
   */
  private var signaturePackage: Option[(String, String, String, Map[String, String], Option[String])] = None

  /**
   * Returns the signature package, generating and caching it if necessary
   * @param key An OAuthKey object containing the consumer and token
   * @return The signature package
   */
  private def getSignaturePackage(implicit key: OAuthKey): (String, String, String, Map[String, String], Option[String]) = {
    if (signaturePackage.isEmpty)
      signaturePackage = Some(generateSignaturePackage)
    signaturePackage.get
  }

  /**
   * Done according to the oauth 1.0a signing specification:
   * http://oauth.net/core/1.0a/#signing_process
   * @param key An OAuthKey object containing the consumer and token
   * @return The signature package
   */
  private def generateSignaturePackage(implicit key: OAuthKey): (String, String, String, Map[String, String], Option[String]) = {

    // 9.1 Signature base string
    // 9.1.1 Normalize Request Parameters
    var parameters = buildParameters
    val providedSignature = parameters.find(d => d._1 == OAuthValues.parameterNames.signature).map(_._2)

    // Remove the signature param
    parameters = parameters.filterKeys(_ != OAuthValues.parameterNames.signature)

    // 9.1.2 Construct Request URL
    val url = normalizeUrl

    // 9.1.3 Concatenate Request Elements
//    val baseString = OAuthUtil.getSignatureBaseString(url, method, parameters)
    val baseString = getSignatureBaseString(url, parameters)

    // 9.2 HMAC-SHA1
    val signKey = OAuthUtil.encode(key.consumerSecret) + "&" + OAuthUtil.encode(key.tokenSecret)
    val signature = Crypto.hmacSha1(baseString, signKey)

    // Return all the important info
    val authHeader = generateAuthHeader(signature, parameters)
    (signature, authHeader, baseString, parameters, providedSignature)
  }

  // ==========================
  //      Helper functions

  /**
   * Generates the base string using the url, method, and parameters
   * @param url The request url
   * @param parameters The map of parameters
   * @return The base string
   */
  def getSignatureBaseString(url: String, parameters: Map[String, String]): String = {
    OAuthUtil.encode(method.toUpperCase) + "&" +
      OAuthUtil.encode(OAuthUtil.normalizeUrl(url)) + "&" +
      OAuthUtil.encode(normalizeParameters(parameters))
  }

  /**
   * Calculates the normalized request parameters string to use in the base string
   * @param parameters The map of parameters
   * @return The normalized parameter string
   */
  def normalizeParameters(parameters: Map[String, String]): String = {
    parameters.toList
      .sortWith((d1, d2) => d1._1 < d2._1) // Sort the parameters by key
      .map(d => OAuthUtil.encode(d._1) + "=" + OAuthUtil.encode(d._2)) // turn into key=value
      .mkString("&") // Combine with ampersands
  }

  /**
   * Creates the authorization header based on the computed signature
   * @param signature The generated signature
   * @param parameters The parameters
   * @return The authorization header
   */
  private def generateAuthHeader(signature: String, parameters: Map[String, String]): String = {
    // Filter out all non-oauth values, add the signature and realm, and combine
    val values = (
      parameters.filterKeys(_.startsWith("oauth_"))
        + (OAuthValues.parameterNames.signature -> signature)
        + (OAuthValues.parameterNames.realm -> normalizeHost)
      ).map(d => d._1 + "=\"" + OAuthUtil.encode(d._2) + "\"")
      .mkString(",")

    "OAuth " + values
  }

  /**
   * Normalizes the host and path and combines them to create the url
   * @return The normalized url
   */
  private def normalizeUrl: String = {
    val normalizedPath = ("/" + path).replaceAll("/+", "/")
    OAuthUtil.normalizeUrl(normalizeHost + normalizedPath)
  }

  /**
   * Normalizes the host by making sure it begins with http:// or https:// and ends with a slash
   * @return The normalized host
   */
  private def normalizeHost: String = {
    val hostSlash = host.replaceAll("/+$", "")
    if (hostSlash.startsWith("http"))
      hostSlash
    else
      "http://" + hostSlash
  }

  /**
   * Collects and combines parameters from the OAuth Authorization header, a URL-encoded body, and the query
   * @return
   */
  private def collectParameters: Map[String, String] = {
    // Parse authorization header
    val authHeaderValues = getAuthHeaderParams

    // HTTP POST body
    val postBody = getPostBodyParams

    // HTTP GET parameters
    val query = getQueryParams

    authHeaderValues ++ postBody ++ query
  }

  /**
   * Checks the query string for parameters
   * @return Parameters
   */
  private def getQueryParams: Map[String, String] = {
    if (queryString.isEmpty)
      Map[String, String]()
    else
      OAuthUtil.parseQuerystring(queryString).toMap
  }

  /**
   * Checks the body for parameters if it's form url encoded
   * @return Parameters
   */
  private def getPostBodyParams: Map[String, String] = {
    if (contentTypeHeader.isDefined && contentTypeHeader.get.startsWith(OAuthValues.urlEncodedContentType))
      OAuthUtil.parseQuerystring(body).toMap
    else
      Map[String, String]()
  }

  /**
   * Checks the OAuth Authorization header for parameters
   * @return Parameters
   */
  private def getAuthHeaderParams: Map[String, String] = {
    authorizationHeader.map(header => {
      header.substring(6).split(",").map(entry => {
        val parts = entry.split("=")
        (parts(0), parts(1).replaceAll("\"", ""))
      }).filterNot(_._1 == OAuthValues.parameterNames.realm).toMap
    }).getOrElse(Map[String, String]())
  }

  /**
   * Given a set of parameters, generates and add any missing OAuth ones.
   * @param parameters The parameters collected so far
   * @param key An OAuthKey containing the consumer and token
   * @return An updated set of parameters
   */
  private def addOauthParameters(parameters: Map[String, String])(implicit key: OAuthKey): Map[String, String] = {
    var updatedParams = Map[String, String]()

    if(parameters.get(OAuthValues.parameterNames.consumerKey).isEmpty)
      updatedParams = updatedParams + (OAuthValues.parameterNames.consumerKey -> key.consumerKey)

    // Add the token parameter if the token isn't the empty string
    if(parameters.get(OAuthValues.parameterNames.token).isEmpty && !key.tokenKey.isEmpty)
      updatedParams = updatedParams + (OAuthValues.parameterNames.token -> key.tokenKey)

    if(parameters.get(OAuthValues.parameterNames.signatureMethod).isEmpty)
      updatedParams = updatedParams + (OAuthValues.parameterNames.signatureMethod -> OAuthValues.signatureMethods.hmacSha1)

    if(parameters.get(OAuthValues.parameterNames.timestamp).isEmpty)
      updatedParams = updatedParams + (OAuthValues.parameterNames.timestamp -> OAuthUtil.getTimestamp)

    if(parameters.get(OAuthValues.parameterNames.nonce).isEmpty)
      updatedParams = updatedParams + (OAuthValues.parameterNames.nonce -> OAuthUtil.getNonce)

    if(parameters.get(OAuthValues.parameterNames.version).isEmpty)
      updatedParams = updatedParams + (OAuthValues.parameterNames.version -> OAuthValues.versions.one)

    parameters ++ updatedParams
  }

  /**
   * Create the set of parameters by collecting them, removing the signature, and adding any missing ones
   * @return The final set of parameters
   */
  private def buildParameters(implicit key: OAuthKey) = {
    // First collect the parameters from the various sources
    var parameters = collectParameters

    // Add any missing oauth parameters
    parameters = addOauthParameters(parameters)

    addBodyHash(parameters)
  }

  /**
   * Checks if the body hash parameters is needed and generates it if needed
   * @param parameters The current set of parameters
   * @return The updated set of parameters
   */
  private def addBodyHash(parameters: Map[String, String]): Map[String, String] = {
    // Add the body hash (used for content types other than url encoded)
    // http://oauth.googlecode.com/svn/spec/ext/body_hash/1.0/drafts/4/spec.html
    val isValidMethod = method.toUpperCase != "GET" && method.toUpperCase != "HEAD"
    val isValidContentType = contentTypeHeader.isDefined && contentTypeHeader.get != OAuthValues.urlEncodedContentType
    if (isValidMethod && isValidContentType) {

      // We meet the criteria for a body hash, so create one
      val hash = Crypto.sha1Base64(body)
      parameters + ("oauth_body_hash" -> hash)
    } else
      parameters
  }
}