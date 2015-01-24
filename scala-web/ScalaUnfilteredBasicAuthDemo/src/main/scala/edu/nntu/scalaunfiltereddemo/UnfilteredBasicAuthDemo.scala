package edu.nntu.scalaunfiltereddemo

import unfiltered.request.Path
import unfiltered.request.Seg
import unfiltered.request.BasicAuth

import unfiltered.request.GET
import unfiltered.response.Ok
import unfiltered.response.NotFound
import unfiltered.response.ResponseString
import unfiltered.response.PlainTextContent
import unfiltered.response.HtmlContent
import unfiltered.response.Unauthorized
import unfiltered.response.WWWAuthenticate

/**
 * Базовая аутентификация HTTP BasicAuth - браузер показывает диалог с запросом
 * имени пользователя и пароля
 * http://unfiltered.databinder.net/Who’s+Who.html
 * http://www.gerd-riesselmann.net/development/authentication-using-unfiltered-scala/
 * http://databinder.3617998.n2.nabble.com/apply-BasicAuth-to-all-matchers-td5755629.html
 * 
 * Нормального способа для логаута не предусмотрено:
 * http://stackoverflow.com/questions/233507/how-to-log-out-user-from-web-site-using-basic-authentication
 * 
 * Авторизация через сторонние сервисы (здесь не рассматривается):
 * https://github.com/unfiltered/unfiltered/tree/0.8.4/oauth
 * https://github.com/unfiltered/unfiltered/tree/0.8.4/oauth2
 * 
 */
object UnfilteredBasicAuthDemo {
  var i = 0
  val echoAuth = unfiltered.filter.Planify {
    case req@BasicAuth(user, password) => 
      i = i + 1
      println(user + ":" + password + ":" + i)
      unfiltered.response.Pass
  }
  
  val handlePath = unfiltered.filter.Planify {
    // Первая защищенная область сайта для администратора (пользователь admin1)
    case req@Path(Seg("admin" :: _)) => req match {
        // пользователей с доступом в эту область сайта может быть больше одного,
        // для этого нужно расширить условие внутри if
        case req@BasicAuth(user, password) if(user == "admin1" && password == "adminpw1") =>
          // после того, как пользователь первый раз введет правильно логин и пароль,
          // все последующие запросы будут приходить как BasicAuth до тех пор, пока
          // пользователь не перезапустит браузер (перезапуск сервера не влияет); 
          // мимо будем пролетать в том случае, если логин и пароль не вводили, или они не подходит
          req match {
            case Path(Seg("admin" :: Nil)) =>
              Ok ~> PlainTextContent ~> ResponseString("Здесь живет админ")
            case Path(Seg("admin" :: "create_db" :: Nil)) =>
              Ok ~> PlainTextContent ~> ResponseString("Здесь живет админ БД")
            case _ =>
              NotFound ~> PlainTextContent ~> ResponseString("HTTP ERROR: 404, Not found")
          }
      
        case _ =>
          // Здесь произойдет запрос пароля в браузере через диалог
          Unauthorized ~> WWWAuthenticate("Basic realm=\"admin password\"")
      }
      
      // Вторая защищенная область сайта для обычного пользователя (пользователь user1)
      // Интересно, что при доступе сначала в первую, а потом во вторую (или наоборот) 
      // защищенные области сайта, браузер запомнит оба введенных пароля и далее
      // при повторном доступе к защищенным страницам будет отправлять их по очереди, 
      // пока один не подойдет
    case req@Path(Seg("user" :: _)) => req match {
        // пользователей с доступом в эту область сайта может быть больше одного,
        // для этого нужно расширить условие внутри if
        case req@BasicAuth(user, password) if(user == "user1" && password == "userpw2") =>
          // после того, как пользователь первый раз введет правильно логин и пароль,
          // все последующие запросы будут приходить как BasicAuth до тех пор, пока
          // пользователь не перезапустит браузер (перезапуск сервера не влияет); 
          // мимо будем пролетать в том случае, если логин и пароль не вводили, или они не подходит
          req match {
            case Path(Seg("user" :: Nil)) =>
              Ok ~> PlainTextContent ~> ResponseString("Здесь живет юзер")
            case Path(Seg("user" :: "photos" :: Nil)) =>
              Ok ~> PlainTextContent ~> ResponseString("Здесь фотки")
            case _ =>
              NotFound ~> PlainTextContent ~> ResponseString("HTTP ERROR: 404, Not found")
          }
      
        case _ =>
          // Здесь произойдет запрос пароля в браузере через диалог
          Unauthorized ~> WWWAuthenticate("Basic realm=\"user password\"")
      }
      
      // Незащищенная область сайта - всё, что за пределами /admin и /user
    case Path(Seg(Nil)) =>
      Ok ~> HtmlContent ~> ResponseString(
        scala.io.Source.fromInputStream(getClass.getResourceAsStream("/html/index.html"), "UTF-8").mkString)
    case Path(Seg("another_page" :: Nil)) =>
      Ok ~> HtmlContent ~> ResponseString(
        scala.io.Source.fromInputStream(getClass.getResourceAsStream("/html/another_page.html"), "UTF-8").mkString)
  }

  def main(args: Array[String]) {
    println("Starting jetty http server demo...")

    // Запустить веб-сервер
    unfiltered.jetty.Server.http(8080).plan(echoAuth).plan(handlePath).run()
  }
}
