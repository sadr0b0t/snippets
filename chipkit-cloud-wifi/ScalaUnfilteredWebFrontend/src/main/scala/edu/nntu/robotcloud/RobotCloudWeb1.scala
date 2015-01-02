package edu.nntu.robotcloud

import unfiltered.request.Path
import unfiltered.request.Seg
import unfiltered.response.Ok
import unfiltered.response.HtmlContent
import unfiltered.response.PlainTextContent
import unfiltered.response.ResponseString

/**
 * Веб-интерфейс для Сервера Роботов на Scala+Unfiltered
 * http://unfiltered.databinder.net/Try+Unfiltered.html
 *
 * с нормальной поддержкой UTF-8 в строке запроса и в теле ответа.
 *
 */
object RobotCloudWeb1 {

  val handlePath = unfiltered.filter.Planify {
    // HTML-страницы
    // начальная страница
    case Path(Seg(Nil)) =>
      Ok ~> HtmlContent ~> ResponseString(
        scala.io.Source.fromInputStream(getClass.getResourceAsStream("/html/index.html"), "UTF-8").mkString)

    // Запросы к сервису: команды для Сервера Роботов
    case Path(Seg("cmd" :: command :: Nil)) =>
      var reply = ""
      try {
        // подключимся к серверу роботов как управляющий интерфейс
        val socket = new java.net.Socket("localhost", 1117)
        val out = socket.getOutputStream()
        val in = socket.getInputStream()

        // отправим команду
        out.write(command.getBytes)
        out.flush
//        println("Write: " + command)

        // прочитаем ответ
        // так красиво не получится - mkString зависнет до тех пор,
        // пока не будет закрыт сокет
        //      var src = scala.io.Source.fromInputStream(in)
        //      reply = src.mkString

        val readBuffer = new Array[Byte](256);
        val readSize = in.read(readBuffer);
        if (readSize != -1) {
          reply = new String(readBuffer, 0, readSize);
        }
//        println("Read: " + reply)

        // закроем подключение
        socket.close
      } catch {
        case e: Exception =>
          reply = "rc:notstarted"
//          e.printStackTrace()
      }

      // покажем ответ
      Ok ~> PlainTextContent ~> ResponseString(reply)
  }

  def main(args: Array[String]) {
    println("Starting Robot Cloud web frontend (on jetty http server)...")
    println("Resources dir: " + getClass.getResource("/public"))

    // Запустить веб-сервер
    unfiltered.jetty.Http.apply(8080).resources(getClass.getResource("/public")).filter(handlePath).run()
  }
}
