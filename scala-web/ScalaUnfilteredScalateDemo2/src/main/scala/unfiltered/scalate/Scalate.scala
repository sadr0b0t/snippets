package unfiltered.scalate

import org.fusesource.scalate.{
  TemplateEngine, Binding, DefaultRenderContext, RenderContext}
import unfiltered.request.{Path,HttpRequest}
import unfiltered.response.{ResponseWriter}
import java.io.{File,OutputStreamWriter,PrintWriter}

object Scalate {
  /** Constructs a ResponseWriter for Scalate templates.
   *  Note that any parameter in the second, implicit set
   *  can be overriden by specifying an implicit value of the
   *  expected type in a pariticular scope. */
  def apply[A, B](request: HttpRequest[A],
                  template: String,
                  attributes:(String,Any)*)
  ( implicit
    engine: TemplateEngine = defaultEngine,
    contextBuilder: ToRenderContext[A] = defaultRenderContext,
    bindings: List[Binding] = Nil,
    additionalAttributes: Seq[(String, Any)] = Nil
  ) = new ResponseWriter {
    def write(writer: OutputStreamWriter) {
      val printWriter = new PrintWriter(writer)
      try {
        val scalateTemplate = engine.load(template, bindings)
        val context = contextBuilder(request, Path(request), printWriter, engine)
        (additionalAttributes ++ attributes) foreach {
          case (k,v) => context.attributes(k) = v
        }
        engine.layout(scalateTemplate, context)
      } catch {
        case e: Exception if engine.isDevelopmentMode =>
          printWriter.println("Exception: " + e.getMessage)
          e.getStackTrace.foreach(printWriter.println)
      }
    }
  }

  /* Function to construct a RenderContext. */
  type ToRenderContext[A] =
    (HttpRequest[A], String, PrintWriter, TemplateEngine) => RenderContext

  private val defaultTemplateDirs = 
    new File("src/main/resources/templates") :: Nil
  private val defaultEngine = new TemplateEngine(defaultTemplateDirs)
  private val defaultRenderContext: ToRenderContext[javax.servlet.http.HttpServletRequest] =
    (request, path, writer, engine) =>
  new UnfilteredRenderContext(request, path, engine, writer)
}

/**
 * A template context for use in Unfiltered-based ssp-pages.
 *
 */
class UnfilteredRenderContext (
  val request: HttpRequest[javax.servlet.http.HttpServletRequest], 
  path: String, engine: TemplateEngine, writer: PrintWriter)
extends DefaultRenderContext(path, engine, writer)

/**
 * Easy access to servlet request state.
 *
 * If you add the following code to your program
 * <code>import unfiltered.scalate.UnfilteredRenderContext._</code>
 * then you can access the current renderContext, request
 */
object UnfilteredRenderContext {
  /**
   * Returns the currently active render context in this thread
   * @throws IllegalArgumentException if there is no suitable render context available in this thread
   */
  def renderContext: UnfilteredRenderContext = RenderContext() match {
    case s: UnfilteredRenderContext => s
    case n => throw new IllegalArgumentException("This threads RenderContext is not a UnfilteredRenderContext as it is: " + n)
  }
  def request: HttpRequest[javax.servlet.http.HttpServletRequest] = renderContext.request
}
