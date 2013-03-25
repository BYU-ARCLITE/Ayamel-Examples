package service

import org.joda.time.format.{DateTimeFormat, DateTimeFormatter, ISODateTimeFormat}
import org.joda.time.DateTime

/**
 * Tools for dealing with string dates.
 */
object TimeTools {

  /**
   * Returns the current date and time as an RFC 3339 formatted date
   * @return The current date and time
   */
  def now: String = ISODateTimeFormat.dateTime().print(new DateTime())

  /**
   * Takes an RFC 3339 formatted date and formats it as something readable for display on pages.
   * @param time The formatted date
   * @return The easy-to-read date
   */
  def prettyTime(time: String): String = {
    val dateTime = new DateTime(time)
    dateTime.toString("MMM dd, yyyy") + " at " + dateTime.toString("hh:mm aa")
  }

  /**
   * This takes a date formatted somehow, parses it, and converts it to a RFC 3339 formatted date
   * @param date The date to format
   * @return The formatted date
   */
  def parseDate(date: String): String = {
//    val dateTime = DateTimeFormat.forPattern("MM/dd/yy").parseDateTime(date)
    val dateTime = new DateTime(date)
    ISODateTimeFormat.dateTime().print(dateTime)

  }
}
