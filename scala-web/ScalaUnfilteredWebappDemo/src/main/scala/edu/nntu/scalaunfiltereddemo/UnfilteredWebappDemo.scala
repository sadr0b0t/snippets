package edu.nntu.scalaunfiltereddemo

import unfiltered.request.Path
import unfiltered.request.Seg
import unfiltered.response.Ok
import unfiltered.response.HtmlContent
import unfiltered.response.PlainTextContent
import unfiltered.response.ResponseString
import unfiltered.response.Html

/**
 * Базовый пример Http-сервера с Unfiltered
 * http://unfiltered.databinder.net/Try+Unfiltered.html
 *
 * с нормально поддержкой UTF-8 в строке запроса и в теле ответа.
 *
 */
object UnfilteredWebappDemo {
  
  val handlePath = unfiltered.filter.Planify {
    /***************************************/
    // страницы HTML
    
    // начальная страница (корень сайта)
    case Path(Seg(Nil)) =>
      Ok ~> HtmlContent ~> ResponseString(
        scala.io.Source.fromInputStream(getClass.getResourceAsStream("/html/index.html"), "UTF-8").mkString)
    
    // статическая html-страница со вставками Ajax
    case Path(Seg("ajax_demo" :: Nil)) =>
      Ok ~> HtmlContent ~> ResponseString(
        scala.io.Source.fromInputStream(getClass.getResourceAsStream("/html/ajax_demo.html"), "UTF-8").mkString)
      
    /***************************************/
    // вызовы rest
    
    // rest-вызов 1: возвращает простой текст
    case Path(Seg("call1" :: Nil)) =>
      Ok ~> PlainTextContent ~> ResponseString("На дровнях обновляет путь;")
    // rest-вызов 2: возвращает простой текст
    case Path(Seg("call2" :: Nil)) =>
      Ok ~> PlainTextContent ~> ResponseString("Плетется рысью как-нибудь;")
  }

  def main(args: Array[String]) {
    println("Starting Scala Unfiltered web application (on jetty http server)...")
    println("Resources dir: " + getClass.getResource("/public"))

    // Запустить веб-сервер
    unfiltered.jetty.Http.apply(8080).resources(getClass.getResource("/public")).filter(handlePath).run()
  }
}
