package dependencies

import play.api.Play.{current, configuration}
import scala.xml.Elem

trait IncFile { val path: String }
trait Include { def xml: Seq[Elem] }

case class Meta(property: String, content: String) extends Include {
  def xml = Seq(<meta property={ property } content={ content } />)
}
case class Icon(path: String, mime: String) extends Include with IncFile {
  def xml = Seq(<link rel="shortcut icon" type={ mime } href={ path } />)
}
case class CSS(path: String) extends Include with IncFile {
  def xml = Seq(<link rel="stylesheet" media="screen" href={ path } />)
}
case class JS(path: String) extends Include with IncFile {
  def xml = Seq(<script src={ path }></script>)
}

sealed abstract class Location extends Include {
  val includes: Seq[Include]

  //manually resolve copy overloading
  def resolve(file: Include, base: String) = file match {
    case f:JS => f.copy(path=base+f.path)
    case f:CSS => f.copy(path=base+f.path)
    case f:Icon => f.copy(path=base+f.path)
	case f:Rel => Absolute(base+f.path, f.includes:_*)
    case _ => file 
  }
  
  def mapxml(base: String) =
    includes.flatMap { file => resolve(file, base).xml }
}

case class Local(includes: Include*) extends Location {
  def xml = mapxml("/assets/")
}

case class Rel(path: String, includes: Include*) extends Location {
  def xml = mapxml(path)
}

case class Absolute(path: String, includes: Include*) extends Location {
  def xml = mapxml(path)
}

case class Extern(path: String, includes: Include*) extends Location {
  def xml = mapxml(Dependencies.config.getString(path).get)
}

object Dependencies {
  val config = configuration.getConfig("dependency").get
  def apply(incs: Include*) = incs.flatMap(_.xml)
}