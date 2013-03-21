package service

import org.apache.commons.codec.binary.Hex

/**
 * Hashing functions.
 */
object HashTools {

  /**
   * The SHA-256 hash, encoded as a Base 64 String.
   * @param input The string to hash
   * @return The hash
   */
  def sha256Base64(input: String): String = {
    val md = java.security.MessageDigest.getInstance("SHA-256")
    new sun.misc.BASE64Encoder().encode(md.digest(input.getBytes))
  }

  /**
   * The SHA-1 hash, encoded as a Base 64 String.
   * @param input The string to hash
   * @return The hash
   */
  def sha1Base64(input: String): String = {
    val md = java.security.MessageDigest.getInstance("SHA-1")
    new sun.misc.BASE64Encoder().encode(md.digest(input.getBytes))
  }

  /**
   * The MD5 hash, encoded as a Hex String.
   * @param input The string to hash
   * @return The hash
   */
  def md5Hex(input: String): String = {
    val md = java.security.MessageDigest.getInstance("MD5")
    new String(Hex.encodeHex(md.digest(input.getBytes)))
  }
}
