name         := "AyamelExamples"

version      := "1.0-SNAPSHOT"

scalaVersion := "2.11.7"

TwirlKeys.templateImports += "dependencies._"

lazy val root = (project in file(".")).enablePlugins(PlayScala).settings(
  libraryDependencies ++= Seq(
    // Add your project dependencies here,
    jdbc,
    cache,
	ws,
    "mysql" % "mysql-connector-java" % "5.1.10",
    "commons-io" % "commons-io" % "2.4",
    "com.google.gdata" % "core" % "1.47.1",
    "com.amazonaws" % "aws-java-sdk" % "1.4.1",
    "org.apache.poi" % "poi-ooxml" % "3.9",
    "org.codemonkey.simplejavamail" % "simple-java-mail" % "2.1",
	"com.typesafe.play" %% "anorm" % "2.4.0"
  )
)


