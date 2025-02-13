const HapiAuthCookie = require('hapi-auth-cookie')

/**
 * Creates authentication logic for admin users
 * @param  {Hapi} server            Hapi.js server instance
 * @param  {Object} options Configiration options passed to admin bro and hapi auth cookie
 * @param  {String} options.logoutPath
 * @param  {String} options.loginPath
 * @param  {String} options.cookiePassword
 * @param  {Function} options.authenticate
 * @param  {Boolean} options.isSecure
 * @param  {String} options.defaultMessage      message which is seen on login page
 * @param  {AdminBro} AdminBro
 * @private
 */
const sessionAuth = async (server, options, AdminBro) => {
  const {
    logoutPath,
    loginPath,
    cookiePassword,
    cookieName,
    authenticate,
    isSecure,
    defaultMessage,
    rootPath,
    strategy,
    ...other
  } = options

  // example authentication is based on the cookie store
  await server.register(HapiAuthCookie)

  server.auth.strategy(strategy, 'cookie', {
    password: cookiePassword,
    cookie: cookieName,
    redirectTo: loginPath,
    isSecure,
    ...other,
  })

  server.route({
    method: ['POST', 'GET'],
    path: loginPath,
    options: {
      auth: { mode: 'try', strategy: 'session' },
      plugins: { 'hapi-auth-cookie': { redirectTo: false } },
    },
    handler: async (request, h) => {
      try {
        let errorMessage = defaultMessage
        if (request.method === 'post') {
          const { email, password } = request.payload
          const admin = await authenticate(email, password)
          if (admin) {
            request.cookieAuth.set(admin)
            return h.redirect(options.rootPath)
          }
          errorMessage = 'Wrong email and/or password'
        }

        // AdminBro exposes function which renders login form for us.
        // It takes 2 arguments:
        // - options.action (with login path)
        // - [errorMessage] optional error message - visible when user
        //                  gives wrong credentials
        return AdminBro.renderLogin({ action: loginPath, errorMessage })
      } catch (e) {
        console.log(e)
        throw e
      }
    },
  })

  server.route({
    method: 'GET',
    path: logoutPath,
    options: { auth: false },
    handler: async (request, h) => {
      request.cookieAuth.clear()
      return h.redirect(loginPath)
    },
  })
}

module.exports = sessionAuth
