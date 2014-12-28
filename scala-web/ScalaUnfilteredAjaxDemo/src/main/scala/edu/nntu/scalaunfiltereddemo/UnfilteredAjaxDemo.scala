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
object UnfilteredAjaxDemo {
  
  val handlePath = unfiltered.filter.Planify {
    // статическая html-страница со вставками Ajax, загружается из ресурсов
    case Path(Seg("ajax_demo" :: Nil)) =>
      Ok ~> HtmlContent ~> ResponseString(
        scala.io.Source.fromInputStream(getClass.getResourceAsStream("/html/ajax_demo.html"), "UTF-8").mkString)
      
    // rest-вызов 1: возвращает простой текст
    case Path(Seg("call1" :: Nil)) =>
      Ok ~> PlainTextContent ~> ResponseString("Это текст от сервера - результат вызова 1")
    // rest-вызов 2: возвращает простой текст
    case Path(Seg("call2" :: Nil)) =>
      Ok ~> PlainTextContent ~> ResponseString("Это текст от сервера - результат вызова 2")
  }

  def main(args: Array[String]) {
    println("Starting jetty http server demo...")

    // Запустить веб-сервер
    unfiltered.jetty.Http.apply(8080).filter(handlePath).run()
  }
}
