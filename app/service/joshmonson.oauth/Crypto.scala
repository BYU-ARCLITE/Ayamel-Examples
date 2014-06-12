package service.joshmonson.oauth

import com.google.api.client.util.Base64
import javax.crypto.Mac
import javax.crypto.spec.SecretKeySpec

/**
 * Cryptographic functions needed for OAuth signatures.
 */
object Crypto {

  /**
   * SHA-1 hash as a base64 encoded string. Needed for body hashes
   * @param input String to hash
   * @return The SHA-1 hash of the input
   */
  def sha1Base64(input: String): String = {
    val md = java.security.MessageDigest.getInstance("SHA-1")
    new String(Base64.encodeBase64(md.digest(input.getBytes)))
  }

  /**
   * Creates a HMAC-SHA1 signature of the input.
   * @param input The string to sign
   * @param key The key to sign with
   * @return The signature
   */
  def hmacSha1(input: String, key: String): String = {
    val mac = Mac.getInstance("HmacSHA1")
    val secret = new SecretKeySpec(key.getBytes, "HmacSHA1")
    mac.init(secret)
    val digest = mac.doFinal(input.getBytes)
    new String(Base64.encodeBase64(digest))
  }
}
