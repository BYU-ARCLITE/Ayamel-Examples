package service

import org.joda.time.format.{DateTimeFormatter, ISODateTimeFormat}
import org.joda.time.DateTime

/**
 * Created with IntelliJ IDEA.
 * User: camman3d
 * Date: 3/21/13
 * Time: 4:03 PM
 * To change this template use File | Settings | File Templates.
 */
object TimeTools {
  def now: String = ISODateTimeFormat.dateTime().print(new DateTime())

  def prettyTime(time: String): String = {
    val dateTime = new DateTime(time)
    dateTime.toString("MMM dd, yyyy") + " at " + dateTime.toString("hh:mm aa")
  }

  def parseDate(date: String): String = {
    date
  }
}
