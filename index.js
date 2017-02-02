require('coffee-script/register')
const express = require('express')
const newrelic = require('artsy-newrelic')
const artsyXapp = require('artsy-xapp')
const artsyPassport = require('artsy-passport')
const mobile = require('./mobile')
const desktop = require('./desktop')
const mobileMiddleware = require('./desktop/lib/middleware/redirect_mobile.coffee')
const cache = require('./lib/cache')
const DesktopUser = require('./desktop/models/current_user.coffee')
const MobileUser = require('./mobile/models/current_user.coffee')
const glob = require('glob')

const app = express()
const { API_URL, CLIENT_ID, CLIENT_SECRET, PORT } = process.env

// Combine user models from desktop and mobile
const MergedUser = DesktopUser.extend(MobileUser)
artsyPassport.options.CurrentUser = MergedUser

// Middleware to direct to mobile or desktop apps
const isResponsive = (url) => {
  const stack = mobileMiddleware.stack.slice(0, -1)
  return stack.filter((route) => route.regexp.test(url)).length > 0
}

const determineDevice = (req, res, next) => {
  const ua = req.get('user-agent')
  const isPhone = Boolean(
    (ua.match(/iPhone/i) && !ua.match(/iPad/i)) ||
    (ua.match(/Android/i) && ua.match(/Mobile/i)) ||
    (ua.match(/Windows Phone/i)) ||
    (ua.match(/BB10/i)) ||
    (ua.match(/BlackBerry/i))
  )
  req.isMobile = isPhone && !isResponsive(req.url)
  next()
}

const routeApp = (req, res, next) => {
  req.isMobile ? mobile(req, res, next) : desktop(req, res, next)
}

const routeErr = (err, req, res, next) => {
  req.isMobile ? mobile(err, req, res, next) : desktop(err, req, res, next)
}

// Mount static assets first so responsive pages don't get confused
glob.sync('desktop/**/public/')
  .concat(glob.sync('mobile/**/public/'))
  .forEach((fld) => app.use(express.static(fld)))

// Mount root-level middleware
app.use(newrelic)
app.use(determineDevice)
app.use(routeApp)
app.use(routeErr)

// Attempt to connect to Redis. If it fails, no worries, the app will move on
// without caching.
cache.setup(() => {
  // Get an xapp token
  artsyXapp.init({ url: API_URL, id: CLIENT_ID, secret: CLIENT_SECRET }, () => {
    // Start server
    app.listen(PORT, () => {
      console.log(`Force listening on port ${PORT}`)
    })
  })
})
