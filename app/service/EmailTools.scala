package service

import play.api.Play
import play.api.Play.current
import org.codemonkey.simplejavamail.{TransportStrategy, Mailer, Email}
import javax.mail.Message.RecipientType
import scala.concurrent.{ExecutionContext, Future}
import ExecutionContext.Implicits.global
import models.Setting

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
      to.foreach { recipient =>
        email.addRecipient(recipient._1, recipient._2, RecipientType.TO)
      }
      email.setText(body)
      email.setTextHTML(bodyHtml)
      mailer.sendMail(email)
    }
  }

  /*
   * =======================
   *   Email Notifications
   */

  val emailData = Map[String, (String, Any => String, Any => String)](
    "notifications.notifyOn.error" ->(
    "Ayamel - Error",
    (data: Any) => {
      val error = data.asInstanceOf[String]
      s"""
        |An error has occurred.
        |$error
      """.stripMargin
    },
    (data: Any) => {
      val error = data.asInstanceOf[String]
      s"""
        |<p>An error has occurred.</p>
        |<p>$error</p>
      """.stripMargin
    }),

    "notifications.notifyOn.errorReport" ->(
    "Ayamel - Error Report",
    (data: Any) => {
      val (errorCode, description, userId) = data.asInstanceOf[(String, String, Long)]
      s"""
          |A user has provided feedback on an error.
          |Error code: $errorCode
          |Description: $description
          |User ID: $userId
        """.stripMargin
    },
    (data: Any) => {
      val (errorCode, description, userId) = data.asInstanceOf[(String, String, Long)]
      s"""
          |<p>A user has provided feedback on an error.</p>
          |<p>Error code: <code>$errorCode</code></p>
          |<p>Description: $description</p>
          |<p>User ID: <code>$userId</code></p>
        """.stripMargin
    }),

    "notifications.notifyOn.bugReport" ->(
      "Ayamel - Bug Report",
      (data: Any) => {
        val (description, reproduce, userAgent) = data.asInstanceOf[(String, String, String)]
        s"""
          |A user has provided the following bug report:
          |
          |Description of Problem:
          |$description
          |
          |Steps to reproduce:
          |$reproduce
          |
          |User Agent: $userAgent
        """.stripMargin
      },
      (data: Any) => {
        val (description, reproduce, userAgent) = data.asInstanceOf[(String, String, String)]
        s"""
          |<p>A user has provided the following bug report:</p>
          |<p><strong>Description of Problem:</strong></p>
          |<p>$description</p>
          |<p><strong>Steps to reproduce:</strong></p>
          |<p>$reproduce</p>
          |<p><strong>User Agent:</strong></p>
          |<p>$userAgent</p>
        """.stripMargin
      }),

    "notifications.notifyOn.suggestion" ->(
      "Ayamel - Feature Suggestion",
      (data: Any) => {
        val suggestion = data.asInstanceOf[String]
        s"""
          |A user has provided the following feature suggestion:
          |$suggestion
        """.stripMargin
      },
      (data: Any) => {
        val suggestion = data.asInstanceOf[String]
        s"""
          |<p>A user has provided the following feature suggestion:</p>
          |<p>$suggestion</p>
        """.stripMargin
      }),

    "notifications.notifyOn.rating" ->(
      "Ayamel - Thoughts/rating submission",
      (data: Any) => {
        val (navigability, find, useful, comments) = data.asInstanceOf[(String, String, String, String)]
        s"""
          |A user has provided the following ratings:
          |
          |Navigability: $navigability
          |Ease of Finding: $find
          |Usefulness: $useful
          |Additional Comments:
          |$comments
        """.stripMargin
      },
      (data: Any) => {
        val (navigability, find, useful, comments) = data.asInstanceOf[(String, String, String, String)]
        s"""
          |<p>A user has provided the following ratings:</p>
          |<p><strong>Navigability:</strong> $navigability</p>
          |<p><strong>Ease of Finding:</strong> $find</p>
          |<p><strong>Usefulness:</strong> $useful</p>
          |<p><strong>Additional Comments:</strong></p>
          |<p>$comments</p>
        """.stripMargin
      })

  )

  def sendAdminNotificationEmail(settingName: String, data: Any) {
    if (Setting.findByName(settingName).get.value == "true") {
      val to = Setting.findByName("notifications.emails").get.value.split("\\s*,\\s*").map(s => (s, s)).toList
        .filterNot(d => d._1.isEmpty)

      if (!to.isEmpty) {
        val messageData = emailData(settingName)
        EmailTools.sendEmail(to, messageData._1)(messageData._2(data))(messageData._3(data))
      }
    }
  }

}
