package tools

import org.apache.commons.codec.binary.Hex

object HashTools {
  def sha256Base64(input: String): String = {
    val md = java.security.MessageDigest.getInstance("SHA-256")
    new sun.misc.BASE64Encoder().encode(md.digest(input.getBytes))
  }

  def md5Hex(input: String): String = {
    val md = java.security.MessageDigest.getInstance("MD5")
    new String(Hex.encodeHex(md.digest(input.getBytes)))
  }
}
