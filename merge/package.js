//
// Merges the Force and Microgravity package.json files
//
const merge = require('package-merge')
const fs = require('fs')
const path = require('path')

const basePackage = {
  "name": "force-merge",
  "version": "1.0.0",
  "description": "",
  "main": "index.js",
  "engines": {
    "node": "6.x.x",
    "npm": "4.x.x"
  },
  "scripts": {
    "mocha": "mocha -r should --compilers coffee:coffee-script/register,js:babel-core/register -t 30000",
    "test": "npm run mocha $(find desktop/test -name '*.coffee') && npm run mocha $(find desktop/components/*/test -name '*.coffee') && npm run mocha $(find desktop/components/**/*/test -name '*.coffee') && npm run mocha $(find desktop/apps/*/test -name '*.coffee') && npm run mocha $(find desktop/apps/*/**/*/test -name '*.coffee') && npm run mocha $(find mobile/test -name '*.coffee') && npm run mocha $(find mobile/components/*/test -name '*.coffee') && npm run mocha $(find mobile/components/**/*/test -name '*.coffee') && npm run mocha $(find mobile/apps/*/test -name '*.coffee') && npm run mocha $(find mobile/apps/*/**/*/test -name '*.coffee')",
    "start": "node -r dotenv/config .",
    "assets": "ezel-assets mobile/assets/ && ezel-assets desktop/assets/"
  },
  "license": "MIT",
}

const a = fs.readFileSync(path.resolve(__dirname, '../mobile/package.json'))
const b = fs.readFileSync(path.resolve(__dirname, '../desktop/package.json'))
const mergedPackage = Object.assign(JSON.parse(merge(a, b)), basePackage)

const fld = path.resolve(__dirname, '../package.json')
fs.writeFileSync(fld, JSON.stringify(mergedPackage, null, 2))
