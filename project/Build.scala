import sbt._
import Keys._
import play.Project._

object ApplicationBuild extends Build {

  val appName         = "AyamelExamples"
  val appVersion      = "1.0-SNAPSHOT"

  val appDependencies = Seq(
    // Add your project dependencies here,
    jdbc,
    anorm,
    "mysql" % "mysql-connector-java" % "5.1.10",
    "commons-io" % "commons-io" % "2.4",
    "com.google.gdata" % "core" % "1.47.1",
    "com.amazonaws" % "aws-java-sdk" % "1.4.1",
    "xuggle" % "xuggle-xuggler" % "5.4"
  )


  val main = play.Project(appName, appVersion, appDependencies).settings(
    // Add your own project settings here
    resolvers += "xuggle repo" at "http://xuggle.googlecode.com/svn/trunk/repo/share/java/"
  )

}
