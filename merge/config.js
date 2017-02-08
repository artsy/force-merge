const { exec } = require('child_process')
const { keys, omit, pick, map, extend, contains } = require('underscore')
const fs = require('fs')
const path = require('path')

const newVars = {
  NODE_ENV: 'development',
  S3_BUCKET: 'force-merge',
  APPLICATION_NAME: 'force-merge',
  APP_URL: 'https://merged.artsy.net',
  COOKIE_DOMAIN: 'merged.artsy.net',
  SESSION_COOKIE_KEY: 'force-merge.session'
}

const blacklistedVars = [
  'NEW_RELIC_LOG',
  'CDN_URL',
  'ASSET_MANIFEST',
  'NODE_MODULES_CACHE',
  'PATH',
  'OLD_S3_KEY',
  'OLD_S3_SECRET',
  'S3_BUCKET',
  'S3_KEY',
  'S3_SECRET',
  'DEBUG',
  'NEW_RELIC_APP_NAME',
  'NEW_RELIC_BROWSER_MONITOR_ENABLE',
  'NEW_RELIC_LOG',
  'NEW_RELIC_LICENSE_KEY',
  'NEW_RELIC_CAPTURE_PARAMS',
  'COMMIT_HASH',
  'OPENREDIS_URL',
  'MARKETING_SIGNUP_MODAL_COPY',
  'MARKETING_SIGNUP_MODAL_HEADER',
  'MARKETING_SIGNUP_MODAL_IMG',
  'MARKETING_SIGNUP_MODAL_SLUG',
  'NPM_CONFIG_PRODUCTION',
  'PORT',
  'HEROKU_APP_ID',
  'HEROKU_APP_NAME',
  'HEROKU_RELEASE_VERSION',
  'HEROKU_SLUG_COMMIT',
  'HEROKU_SLUG_DESCRIPTION'
]

const publicVars = [
  'API_URL',
  'APP_URL',
  'METAPHYSICS_ENDPOINT',
  'POSITRON_URL',
  'PREDICTION_URL',
  'ADMIN_URL',
  'CMS_URL',
  'GALAXY_URL',
  'GEMINI_CLOUDFRONT_URL',
  'MOBILE_URL',
  'SECURE_IMAGES_URL',
  'ARTSY_URL',
  'FORCE_URL',
  'CONSIGNMENTS_APP_URL',
  'FUSION_URL',
  'GEMINI_ACCOUNT_KEY',
  'GENOME_URL',
  'REFLECTION_URL'
]

const dotEnvTemplate = `
# OSS version of the .env file
# Note: The ARTSY_ID & ARTSY_SECRET are known keys for Artsy OSS
# projects, and are not a problem. OSS peeople: Please don't abuse the keys,
# as then we'll have to change it, making it harder for others to learn from.
# As such, these keys do not come under the Artsy security bounty either.

# Shared
__SHARED__

# Migration
OLD_S3_KEY=
OLD_S3_SECRET=

# Desktop
__DESKTOP__

# Mobile
__MOBILE__
`

const write = (fname, str) =>
  new Promise((resolve, reject) => {
    const file = path.resolve(__dirname, '../') + '/' + fname
    fs.writeFile(file, str, (err, res) => {
      err ? reject(err) : resolve(res)
    })
  })

const spawn = (cmd) =>
  new Promise((resolve, reject) => exec(cmd, (err, stdout) => {
    err ? reject(err) : resolve(stdout)
  }))

const config = async (app) => {
  const str = await spawn(`heroku config --app=${app}`)
  const hash = {}
  str.split('\n').forEach((line) => {
    const [key, ...rest] = line.split(':').map((str) => str.replace(/ /g, ''))
    if (!(key.match('===') || key === '')) hash[key] = rest.join(':')
  })
  return hash
}

const toEnv = (hash, shared = false) => {
  const vars = extend(
    omit(hash, blacklistedVars, newVars),
    shared ? newVars : {}
  )
  return map(vars, (v, k) => `${k}=${v}`).join('\n')
}

const toPublicEnv = (hash, shared = false) => {
  const vars = extend(
    omit(hash, blacklistedVars, newVars),
    shared ? newVars : {}
  )
  return map(vars, (v, k) =>
    `${k}=${contains(publicVars, k) ? v : ''}`
  ).join('\n')
}

const main = async () => {
  console.log('Downloading Force & MG config...')
  const desktop = await config('force-production')
  const mobile = await config('microgravity-production')
  const desktopOnly = omit(desktop, keys(mobile))
  const mobileOnly = omit(mobile, keys(desktop))
  const shared = pick(desktop, keys(mobile))
  const dotEnv = dotEnvTemplate
    .replace('__SHARED__', toEnv(shared, true))
    .replace('__DESKTOP__', toEnv(desktopOnly))
    .replace('__MOBILE__', toEnv(mobileOnly))
  const dotEnvPublic = dotEnvTemplate
    .replace('__SHARED__', toPublicEnv(shared, true))
    .replace('__DESKTOP__', toPublicEnv(desktopOnly))
    .replace('__MOBILE__', toPublicEnv(mobileOnly))
  console.log('Writing new env files...')
  await Promise.all([
    write('.env', dotEnv),
    write('.env.oss', dotEnvPublic)
  ])
  console.log('Finished merging config')
}

main().catch(console.error.bind(console))
