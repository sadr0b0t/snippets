package edu.nntu.scalaunfiltereddemo

import unfiltered.request.Path
import unfiltered.request.Seg
import unfiltered.response.Ok
import unfiltered.response.ContentType
import unfiltered.response.CssContent
import unfiltered.response.HtmlContent
import unfiltered.response.PlainTextContent
import unfiltered.response.ResponseBytes
import unfiltered.response.ResponseString
import unfiltered.response.ResponseWriter
import unfiltered.response.Html

/**
 * Базовый пример Http-сервера с Unfiltered
 * http://unfiltered.databinder.net/Try+Unfiltered.html
 *
 * с нормально поддержкой UTF-8 в строке запроса и в теле ответа.
 *
 */
object UnfilteredBasicDemo {
  /**
   * Перекодировщик URL
   * Отсюда:
   * http://stackoverflow.com/questions/18083311/url-decoding-with-unfiltered
   */
  object Decode {
    import java.net.URLDecoder
    import java.nio.charset.Charset

    trait Extract {
      def charset: Charset
      def unapply(raw: String) =
        scala.util.Try(URLDecoder.decode(raw, charset.name())).toOption
    }

    object utf8 extends Extract {
      val charset = Charset.forName("utf8")
    }
  }

  val handlePath = unfiltered.filter.Planify {
    // список определений доступных XXXContent:
    // https://github.com/unfiltered/unfiltered/blob/master/library/src/main/scala/response/types.scala
    
    // начальная страница
    case Path(Seg(Nil)) =>
      Ok ~> PlainTextContent ~> ResponseString("Демонстрация работы фреймворка Unfiltered для языка Scala")
      
    // простой текст
    case Path(Seg("plain_text" :: Nil)) =>
      // PlainTextContent добавит заголовок Content-Type с UTF-8:
      Ok ~> PlainTextContent ~> ResponseString("Это текст от сервера")
      // Можно и так, но тогда браузер не распознает UTF-8 строки:
      // Ok ~> ResponseString("Это текст от сервера" )
      
    // демо html-страницы, встроенной в код scala
    case Path(Seg("inline_html" :: Nil)) =>
      Ok ~> HtmlContent ~> Html(
        <html>
          <head>
            <title>Scala Unfiltered framework basic demo</title>
            <meta charset="UTF-8"/>
          </head>
          <body>
            <div>
              Демонстрация работы фреймворка Unfiltered для языка Scala:
            это HTML-страница, встроенная в код файла scala.
            </div>
          </body>
        </html>)
      
    // статическая html-страница, загружается из ресурсов
    case Path(Seg("static_html" :: Nil)) =>
      Ok ~> HtmlContent ~> ResponseString(
        scala.io.Source.fromInputStream(getClass.getResourceAsStream("/html/static_html.html"), "UTF-8").mkString)
      
    // css-файл со стилем страницы, загружается из ресурсов
    case Path(Seg("site.css" :: Nil)) =>
      Ok ~> CssContent ~> ResponseString(
        scala.io.Source.fromInputStream(
          getClass.getResourceAsStream("/public/site.css"), "UTF-8").mkString)
      
    // картинка, загружается из ресурсов
    case Path(Seg("lasto4ka.png" :: Nil)) =>
      val in = getClass.getResourceAsStream("/public/lasto4ka.png")
      val bytes = new Array[Byte](in.available)
      in.read(bytes)

      // Предопределенных классов Content для картинок в стандартной 
      // поставке не нашлось, добавим свои:
      object JpegImageContent extends ContentType("image/jpeg")
      object PngImageContent extends ContentType("image/png")
      
      Ok ~> PngImageContent ~> ResponseBytes(bytes)
      
    // другая картинка, загружается из ресурсов
    case Path(Seg("led6_on.png" :: Nil)) =>
      val in = getClass.getResourceAsStream("/public/led6_on.png")
      val bytes = new Array[Byte](in.available)
      in.read(bytes)

      // Предопределенных классов Content для картинок в стандартной 
      // поставке не нашлось, добавим свои:
      object JpegImageContent extends ContentType("image/jpeg")
      object PngImageContent extends ContentType("image/png")
      
      Ok ~> PngImageContent ~> ResponseBytes(bytes)
      
    // работа с сегментами напрямую
    case Path(Decode.utf8(Seg(path :: Nil))) =>
      Ok ~> PlainTextContent ~> ResponseString("Ваш сегмент: " + path)
  }

  def main(args: Array[String]) {
    println("Starting jetty http server demo...")

    // Запустить веб-сервер
    unfiltered.jetty.Http.apply(8080).filter(handlePath).run()
  }
}
