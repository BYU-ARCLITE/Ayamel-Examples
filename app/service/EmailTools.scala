package service

import play.api.Play
import play.api.Play.current
import org.codemonkey.simplejavamail.{TransportStrategy, Mailer, Email}
import javax.mail.Message.RecipientType
import scala.concurrent.{ExecutionContext, Future}
import ExecutionContext.Implicits.global

/**
 * Created with IntelliJ IDEA.
 * User: Josh
 * Date: 1/24/13
 * Time: 10:28 AM
 * To change this template use File | Settings | File Templates.
 */
object EmailTools {

  val host = Play.configuration.getString("smtp.host").get
  val port = Play.configuration.getInt("smtp.port").get
  val name = Play.configuration.getString("smtp.name").get
  val address = Play.configuration.getString("smtp.address").get
  val password = Play.configuration.getString("smtp.password").get
  val mailer = new Mailer(host, port, address, password, TransportStrategy.SMTP_SSL)

  def sendEmail(to: List[(String, String)], subject: String)(body: String)(bodyHtml: String = body) = {
    Future {
      val email = new Email()
      email.setFromAddress(name, address)
      email.setSubject(subject)
      to.foreach(recipient => {email.addRecipient(recipient._1, recipient._2, RecipientType.TO)})
      email.setText(body)
      email.setTextHTML(bodyHtml)
      mailer.sendMail(email)
    }
  }

}
