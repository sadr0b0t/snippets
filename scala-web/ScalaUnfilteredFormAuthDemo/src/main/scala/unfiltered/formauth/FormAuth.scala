package unfiltered.formauth

import unfiltered.request._
import unfiltered.response._

import javax.servlet.http.HttpServletRequest
import javax.servlet.http.HttpServletResponse
  
/** 
 * Form-based authentication info extractor. 
 * Checks for parameters j_username and j_password. 
 * Returns Some(j_username, j_password) if both provided or None.
 */
object FormAuth {
    
  object JUsername extends Params.Extract("j_username", Params.first)
  object JPassword extends Params.Extract("j_password", Params.first)
    
  /** @return Some(j_username, j_password) or None */
  def unapply[T](r: HttpRequest[T]) = r match {
    case Params(JUsername(j_username) & JPassword(j_password)) => 
      Some(j_username, j_password)
    case _ => None
  }
  def apply[T](r: HttpRequest[T]) = unapply(r)
}

/**
 * Authenticated user info.
 * 
 * @param name user name.
 * @param role user role (determines, what protected resources are available to user).
 * @param password user password (or password hash).
 */
case class User (name : String, role : String, password : String)

/**
 * Implement to manage authentication mechanisms like user management,
 * password encription etc.
 */
trait Users {
  
  /**
   * Authenticate user.
   * 
   * @param username
   * @param password
   * 
   * @return user info as Option[User] if user is authenticated, None if not authenticated
   */
  def authenticate(username : String, password: String): Option[User]
}
  
/**
 * Workflow for form-based user authentication and authorization.
 * 
 * Post to /j_security_check j_username and j_password to authenticate.
 * Request (either GET or POST) /logout to logout.
 * 
 * Authentication info is stored in session, so application container should
 * support session management.
 * 
 * Authorization is based on user role.
 * 
 * Authenticated user for the given request session can be accessed with 
 * <code>remoteUser</code> inside application code.
 *
 * @param users registered users for authentication.
 * 
 * @param authRoles returns list (as Option[Set[String]]) of user roles, 
 * authorized to access given resource, or None, if given resource is not protected.
 * 
 * @param authEvents returns corresponging HttpResponse for the provided authentication event:
 * login (user is not authenticated), error (error during authentication) or 
 * forbidden (user is authenticated, but not authorized to view requested resource). 
 * Normally, this should be HTML page with corresponding message. 
 * For login and error events this page should also contain login info submit form
 * with method="POST" and action="/j_security_check" parameters and at least two input text
 * fields with name="j_username" parameter for user name field and 
 * name="j_password" and type="password" parameters for password field.
 * Simple implementation with inline HTML is provided by default.
 */
case class JSecurityCheck (
  users : Users, 
  authRoles : (HttpRequest[HttpServletRequest]) => Option[Set[String]],
  authEvents : (HttpRequest[HttpServletRequest], String) => ResponseFunction[HttpServletResponse] = 
    (req : HttpRequest[HttpServletRequest], event : String) => {        
      event match {
        case "login" => 
          Unauthorized ~> HtmlContent ~> Html(
            <html>
              <head>
                <title>Form auth: login</title>
                <meta charset="UTF-8"/>
              </head>
              <body>
                <h1>Login</h1>
                <form method="POST" action="/j_security_check">
                  <label for="username">login:</label>
                  <input id="username" type="text" name="j_username" size="25" value=""/>
                  <label for="password">password:</label>
                  <input id="password" type="password" name="j_password" size="25" value=""/>
                  <input type="submit" class="submit" value="Login"/>
                </form>
              </body>
            </html>
          )
            
        case "error" => 
          Unauthorized ~> HtmlContent ~> Html(
            <html>
              <head>
                <title>Form auth: login error</title>
                <meta charset="UTF-8"/>
              </head>
              <body>
                <h1>Login error</h1>
                <form method="POST" action="/j_security_check">
                  <label for="username">login:</label> 
                  <input id="username" type="text" name="j_username" size="25" value=""/>
                  <label for="password">password:</label>
                  <input id="password" type="password" name="j_password" size="25" value=""/>
                  <input type="submit" class="submit" value="Login"/>
                </form>
              </body>
            </html>
          )
            
        case "forbidden" => 
          Forbidden ~> HtmlContent ~> Html(
            <html>
              <head>
                <title>Form auth: forbidden</title>
                <meta charset="UTF-8"/>
              </head>
              <body>
                <h1>Forbidden</h1>
              </body>
            </html>
          )
      }
    } )
  extends unfiltered.filter.Plan {
  
    // Probably, this could be better done with session management API built-in
    // HttpServletRequest, which can be accessed with HttpRequest.underlying call,
    // but not sure if this will work with all servlet containers, so let it be 
    // in this way for now, maybe some time later
    
    /**
     * Session ids for authenticated users map
     */
    private var authSessions = Map[String, User]()
  
    /**
     * Session id to last requested protected resource map
     */
    private var authRequests = Map[String, String]()
    
    def intent = {
      case req@POST( Path(Seg("j_security_check" :: Nil)) & FormAuth(j_username, j_password) ) =>
      
        if( authenticate(j_username, j_password, req) ) {
          val sessionId = getSessionId(req)
          if( !sessionId.isEmpty && authRequests.contains(sessionId.get) ) {
            // athentication success, now go to the requested resource
            val path = authRequests(sessionId.get)
            authRequests -= sessionId.get
            Redirect( path )
          } else {
            // redirect to site root, if requested protected page is not found 
            // (actually, most likey this will never happen, cause if sessions 
            // are not supported, authenticatication will not work too)
            Redirect("/")
          }
        } else
          authEvents(req, "error")
      
      case req@Path(Seg("logout" :: Nil)) =>
        logout(req)
        Redirect("/")
        
      case req@Path( path ) if( !authorized(req, authRoles) ) =>
        if( !authenticated(req) ) {
          // we are not authenticated, suggest to authenticate
        
          // save requested resource path, so will be able to redirect to it
          // if login success
          val sessionId = getSessionId(req)
          if(!sessionId.isEmpty) authRequests += (sessionId.get -> path)
      
          // show login form
          authEvents(req, "login")
        } else {
          // we are authenticated, but access is forbidden
        
          // show forbidden page
          authEvents(req, "forbidden")
        }
    }
  
    /**
     * Authenticate user with provided login name and password.
     * 
     * @param username
     * @param password
     * @param req
     * 
     * @return true if user is authenticated, false if authentication failed
     */
    def authenticate[T](username : String, password : String, req : HttpRequest[T]) = {
      val user = users.authenticate(username, password)
      val sessionId = getSessionId(req)
    
      if( !user.isEmpty && !sessionId.isEmpty ) {
        authSessions += (sessionId.get -> user.get)
        true
      } else false
    }
  
    /**
     * Logout user.
     * 
     * @param req
     */
    def logout[T](req : HttpRequest[T]) {
      val sessionId = getSessionId(req)
      if( !sessionId.isEmpty ) authSessions -= sessionId.get
    }

    /**
     * Get session id for the given HTTP request.
     * 
     * @param req
     * 
     * @return session id as Option[String] for the HTTP request or None if 
     * sessions are not supported with current application container
     */
    def getSessionId[T](req : HttpRequest[T]) = {
      var sessionId : Option[String] = None
      if(req.underlying.isInstanceOf[javax.servlet.http.HttpServletRequest]) {
        val jreq = req.underlying.asInstanceOf[javax.servlet.http.HttpServletRequest]
        try {
          sessionId = Some(jreq.getSession.getId)
        } catch {
          case e : Throwable => e.printStackTrace
        }
      }
      sessionId
    }
  
    /**
     * Check, if given session is authenticated (belongs to the logged in user).
     * 
     * @param req
     */
    def authenticated[T]( req : HttpRequest[T] ) = {
      val sessionId = getSessionId(req)
      if(sessionId.isEmpty) {
        // no valid session id found, forbid access to the resource
        false
      } else {
        // session id found, check, if it is authenticated
        authSessions.contains(sessionId.get)
      }
    }
  
    /**
     * Check if current user is authorized to access requested resource.
     * 
     * @param req requested resource to check
     * @param authRoles returns list of user roles, authorized to access given resource, 
     * or None if given resource is not protected.
     * @return true, if current user is authorized to access requested resource,
     * false if access is denied.
     */
    def authorized[T]( req : HttpRequest[T], 
                      authRoles : (HttpRequest[T]) => Option[Set[String]] ) = {
      val roles = authRoles(req)
      if(roles.isEmpty) {
        // the request resource is not protected
        true
      } else {
        // request resource is protected - check for permission
        val sessionId = getSessionId(req)
        if(sessionId.isEmpty) {
          // no valid session id detected, forbid access to the resource
          false
        } else {
          // session id found, check, if it is authenticated;
          // if authenticated, check for permission for resource
          authSessions.contains(sessionId.get) && roles.get.contains(authSessions(sessionId.get).role)
        }
      }
    }
    
    /**
     * Get authenticated user for the provided request session or None
     * if user is not authorized.
     * 
     * @param req
     * @return authenticated user as Option[User] or None
     */
    def remoteUser[T](req : HttpRequest[T]) : Option[User] = {
      val sessionId = getSessionId(req)
      if(sessionId.isEmpty) {
        // no valid session id found, no user can be here
        None
      } else {
        // session id found, check, if user is authenticated
        authSessions.get(sessionId.get)
      }
    }
  }
