package service

/**
 * Created with IntelliJ IDEA.
 * User: camman3d
 * Date: 3/27/13
 * Time: 2:44 PM
 * To change this template use File | Settings | File Templates.
 */
object SerializationTools {

  def escapeString(str: String): String = str.replaceAll("=", "{{equals}}").replaceAll("\\&", "{{amp}}")

  def unescapeString(str: String): String = str.replaceAll("\\{\\{equals\\}\\}", "=").replaceAll("\\{\\{amp\\}\\}", "&")

  def serializeMap(map: Map[String, String]): String =
    map.toList.map(d => escapeString(d._1) + "=" + escapeString(d._2)).mkString("&")

  def unserializeMap(str: String): Map[String, String] = {
    if (str.isEmpty)
      Map()
    else
      str.split("\\&").map(s => {
        val data = s.split("=")
        (unescapeString(data(0)), unescapeString(data(1)))
      }).toMap
  }

}
