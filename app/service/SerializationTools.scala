package service

import java.io.{ByteArrayInputStream, ObjectInputStream, ObjectOutputStream, ByteArrayOutputStream}
import org.apache.commons.codec.binary.Base64
object SerializationTools {

  def objectToString(obj: AnyRef): String = {
    val stream = new ByteArrayOutputStream()
    val out = new ObjectOutputStream(stream)
    out.writeObject(obj)
    out.close()
    new String(Base64.encodeBase64(stream.toByteArray))
  }

  def stringToObject[A](str: String): A = {
    val data = Base64.decodeBase64(str.getBytes)
    val in = new ObjectInputStream(new ByteArrayInputStream(data))
    val obj = in.readObject().asInstanceOf[A]
    in.close()
    obj
  }

  def serializeMap(map: Map[String, String]): String = objectToString(map)

  def unserializeMap(str: String): Map[String, String] = stringToObject[Map[String, String]](str)

}
