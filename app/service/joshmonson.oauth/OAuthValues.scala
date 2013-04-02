package service.joshmonson.oauth

/**
 * Standard values used in OAauth 1.0a message signing
 */
object OAuthValues {
  val urlEncodedContentType = "application/x-www-form-urlencoded"

  object parameterNames {
    val realm = "realm"

    val bodyHash = "oauth_body_hash"
    val consumerKey = "oauth_consumer_key"
    val nonce = "oauth_nonce"
    val signature = "oauth_signature"
    val signatureMethod ="oauth_signature_method"
    val timestamp = "oauth_timestamp"
    val token = "oauth_token"
    val version = "oauth_version"
  }

  object signatureMethods {
    val hmacSha1 = "HMAC-SHA1"
  }

  object versions {
    val one = "1.0"
  }
}
