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
   * Перекодировщик URL для нормальной работы с UTF-8
   * Отсюда: http://stackoverflow.com/questions/18083311/url-decoding-with-unfiltered
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

  // Для контейнера веб-приложений jetty
  val handlePath = unfiltered.filter.Planify {
    // Для контейнера веб-приложений netty
    //  val handlePath = unfiltered.netty.cycle.Planify {

    // список определений доступных XXXContent:
    // https://github.com/unfiltered/unfiltered/blob/master/library/src/main/scala/response/types.scala

    // начальная страница (корень сайта)
    case Path(Seg(Nil)) =>
      Ok ~> PlainTextContent ~> ResponseString("Демонстрация работы фреймворка "
        + "Unfiltered для языка Scala, попробуйте сегменты в строке адреса: "
        + "plain_text, inline_html, static_html, site.css, lasto4ka.png, buggy.png")

    // простой текст
    case Path(Seg("plain_text" :: Nil)) =>
      // PlainTextContent добавит заголовок Content-Type с UTF-8:
      Ok ~> PlainTextContent ~> ResponseString("Это простой текст от сервера")
    // Можно и так, но тогда браузер не распознает UTF-8 строки:
    // Ok ~> ResponseString("Это простой текст от сервера" )

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

    /**************************/
    // Ниже для интереса попробуем отдавать вручную разные ресурсы (css, картинки),
    // но лучше для них использовать возможности контейнеров Jetty/Netty или
    // внешний веб-сервер для раздачи статического контента типа nginx
     
    // css-файл со стилем страницы, загружается из ресурсов
    case Path(Seg("site.css" :: Nil)) =>
      Ok ~> CssContent ~> ResponseString(
        scala.io.Source.fromInputStream(
          getClass.getResourceAsStream("/public/site.css"), "UTF-8").mkString)

    // картинка, загружается из ресурсов
    case Path(Seg("lasto4ka.png" :: Nil)) =>
      val in = getClass.getResourceAsStream("/public/lasto4ka.png")

      // так в некоторых случаях может не сработать - за один раз будет считан 
      // не весь файл, а только часть, поэтому придется через ByteArrayOutputStream
      // (подробности: https://groups.google.com/forum/#!topic/unfiltered-scala/czRtn5Vnoug)
      //      val bytes = new Array[Byte](in.available)
      //      in.read(bytes)     

      val buffer = new java.io.ByteArrayOutputStream()
      val data = new Array[Byte](16384)
      var nRead = in.read(data, 0, data.length)
      while (nRead != -1) {
        buffer.write(data, 0, nRead)
        nRead = in.read(data, 0, data.length)
      }
      buffer.flush()
      val bytes = buffer.toByteArray();

      // Предопределенных классов Content для картинок в стандартной 
      // поставке не нашлось, добавим свои:
      object JpegImageContent extends ContentType("image/jpeg")
      object PngImageContent extends ContentType("image/png")

      Ok ~> PngImageContent ~> ResponseBytes(bytes)

    // другая картинка, загружается из ресурсов
    case Path(Seg("buggy.png" :: Nil)) =>
      val in = getClass.getResourceAsStream("/public/buggy.png")

      // так в некоторых случаях может не сработать - за один раз будет считан 
      // не весь файл, а только часть, поэтому придется через ByteArrayOutputStream
      // (подробности: https://groups.google.com/forum/#!topic/unfiltered-scala/czRtn5Vnoug)
      //      val bytes = new Array[Byte](in.available)
      //      in.read(bytes)     

      val buffer = new java.io.ByteArrayOutputStream()
      val data = new Array[Byte](16384)
      var nRead = in.read(data, 0, data.length)
      while (nRead != -1) {
        buffer.write(data, 0, nRead)
        nRead = in.read(data, 0, data.length)
      }
      buffer.flush()
      val bytes = buffer.toByteArray();

      // Предопределенных классов Content для картинок в стандартной 
      // поставке не нашлось, добавим свои:
      object JpegImageContent extends ContentType("image/jpeg")
      object PngImageContent extends ContentType("image/png")

      Ok ~> PngImageContent ~> ResponseBytes(bytes)

    /**************************/
    // работа с сегментами напрямую (убрать при работе с внешними ресурсами,
    // подробности: https://groups.google.com/forum/#!topic/unfiltered-scala/czRtn5Vnoug)
    case Path(Decode.utf8(Seg(path :: Nil))) =>
      Ok ~> PlainTextContent ~> ResponseString("Ваш сегмент: " + path)
  }

  def main(args: Array[String]) {
    // Запустить контейнер веб-приложенией Jetty
    println("Starting Scala Unfiltered web framework demo on Jetty http server...")
    unfiltered.jetty.Http.apply(8080).plan(handlePath).run()
    //    println("Resources dir: " + getClass.getResource("/public"))
    //    unfiltered.jetty.Http.apply(8080).resources(getClass.getResource("/public")).plan(handlePath).run()

    // Запустить контейнер веб-приложенией Netty
    //    println("Starting Scala Unfiltered web framework demo on Netty http server...")
    //    unfiltered.netty.Http(8080).plan(handlePath).run()
  }
}
