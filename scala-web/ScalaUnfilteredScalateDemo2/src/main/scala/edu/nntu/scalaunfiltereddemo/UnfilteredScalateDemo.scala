package edu.nntu.scalaunfiltereddemo

import unfiltered.request.Path
import unfiltered.request.Seg
import unfiltered.request.GET
import unfiltered.response.Ok
import unfiltered.scalate.Scalate

/**
 * http://www.slideshare.net/strachaj/introducing-scalate-the-scala-template-engine
 * http://scalate.github.io/scalate/documentation/ssp-reference.html
 * 
 * Scalate+Unfiltered:
 * https://github.com/unfiltered/unfiltered-scalate.g8/blob/master/src/main/g8/src/main/scala/Example.scala
 * 
 */
object UnfilteredScalateDemo {

  val handlePath = unfiltered.filter.Planify {
    case req@GET(Path(Seg(Nil))) =>
      Ok ~> Scalate(req, "index.ssp")
  }

  def main(args: Array[String]) {
    println("Starting jetty http server demo...")

    // Запустить веб-сервер
    unfiltered.jetty.Server.http(8080).plan(handlePath).run()
  }
}
