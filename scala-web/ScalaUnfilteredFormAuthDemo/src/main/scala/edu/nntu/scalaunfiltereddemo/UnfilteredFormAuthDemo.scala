package edu.nntu.scalaunfiltereddemo

import unfiltered.request.&
import unfiltered.request.GET
import unfiltered.request.POST
import unfiltered.request.Path
import unfiltered.request.Seg
import unfiltered.request.Params
import unfiltered.request.HttpRequest
import unfiltered.response.Ok
import unfiltered.response.Unauthorized
import unfiltered.response.Forbidden
import unfiltered.response.PlainTextContent
import unfiltered.response.ResponseString
import unfiltered.scalate.Scalate
import unfiltered.formauth._

import unfiltered.scalate.UnfilteredRenderContext._ 


/**
 * http://www.slideshare.net/strachaj/introducing-scalate-the-scala-template-engine
 * http://scalate.github.io/scalate/documentation/ssp-reference.html
 * 
 * Params and POST:
 * http://unfiltered.databinder.net/Within+the+Parameters.html
 * 
 * request extractor example:
 * https://github.com/unfiltered/unfiltered/blob/0.8.4/library/src/main/scala/request/auths.scala
 * 
 * На Jetty: "IllegalStateException: No SessionManager" thrown when using FormAuthenticator
 * https://bugs.eclipse.org/bugs/show_bug.cgi?id=403369
 * 
 */
object UnfilteredFormAuthDemo {
  
  val securityCheck = JSecurityCheck(
    new Users() {
      def authenticate(username : String, password: String) = {
        username match {
          case "admin" if(password == "adminpw") => Some(User("admin", "admin", "adminpw"))
          case "user1" if(password == "user1pw") => Some(User("user1", "user", "user1pw"))
          case "user2" if(password == "user2pw") => Some(User("user2", "user", "user2pw"))
          case _ => None
        }
      }}, 
    (req : HttpRequest[javax.servlet.http.HttpServletRequest]) => {
      req match {
        case Path(Seg("admin" :: Nil)) => Some(Set("admin"))
        case Path(Seg("admin" :: "manage" :: Nil)) => Some(Set("admin"))
        case Path(Seg("profile" :: Nil)) => Some(Set("admin", "user"))
        case Path(Seg("profile" :: "photo" :: Nil)) => Some(Set("admin", "user"))
        case _ => None
      }
    },
    (req : HttpRequest[javax.servlet.http.HttpServletRequest], event : String) => {
      import unfiltered.scalate.Scalate
        
      event match {
        case "login" => 
          Unauthorized ~> Scalate(req, "auth/login.ssp")
        case "error" => 
          Unauthorized ~> Scalate(req, "auth/error.ssp")
        case "forbidden" => 
          Forbidden ~> Scalate(req, "auth/forbidden.ssp")
      }
    }
  )

  val handlePath = unfiltered.filter.Planify {
    // protected pages
    case req@Path(Seg("admin" :: Nil)) =>
      Ok ~> Scalate(req, "admin.ssp")
      
    case req@Path(Seg("admin" :: "manage" :: Nil)) =>
      Ok ~> Scalate(req, "admin_manage.ssp")
      
    case req@Path(Seg("profile" :: Nil)) =>
      Ok ~> Scalate(req, "profile.ssp")
      
    case req@Path(Seg("profile" :: "photos" :: Nil)) =>
      Ok ~> Scalate(req, "profile_photos.ssp")
      
      // unprotected pages
    case req@Path(Seg(Nil)) =>
      Ok ~> Scalate(req, "index.ssp")
      
    case req@Path(Seg("another" :: Nil)) =>
      Ok ~> Scalate(req, "another.ssp")
  }

  def main(args: Array[String]) {
    
    println("Starting jetty http server...")

    // Запустить веб-сервер
    unfiltered.jetty.Server.http(8080).plan(securityCheck).plan(handlePath).run()   
  }
}
