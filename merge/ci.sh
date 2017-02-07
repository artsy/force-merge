echo "Downloading Force & Microgravity into desktop and mobile folders..."
rm -rf ./desktop
rm -rf ./mobile
git clone git@github.com:artsy/force.git desktop
git clone git@github.com:artsy/microgravity.git mobile
rm -rf desktop/.git
rm -rf mobile/.git

echo "Merging package.json files and installing modules..."
rm -rf node_modules
npm i package-merge
node ./merge/package.js
npm i dotenv --save
npm i rewire@2.2.0 --save-dev
npm i glob --save
npm i

echo "Merging environment files & config..."
node -r babel-core/register merge/config.js

echo "Syncing merged S3 buckets..."
rm -rf tmp
mkdir tmp
npm i s3
node -r dotenv/config merge/buckets.js

echo "De-duplicating config and project files..."
rm -rf ./desktop/CONTRIBUTING.md
rm -rf ./desktop/Dangerfile
rm -rf ./desktop/doc
rm -rf ./desktop/docker-compose.yml
rm -rf ./desktop/Dockerfile
rm -rf ./desktop/LICENSE
rm -rf ./desktop/Makefile
rm -rf ./desktop/npm-shrinkwrap.json
rm -rf ./desktop/package.json
rm -rf ./desktop/Procfile
rm -rf ./desktop/Procfile.dev
rm -rf ./desktop/README.md
rm -rf ./desktop/.env.oss
rm -rf ./desktop/.gitignore
rm -rf ./desktop/test/mocha.opts
rm -rf ./mobile/CONTRIBUTING.md
rm -rf ./mobile/Dangerfile
rm -rf ./mobile/doc
rm -rf ./mobile/LICENSE.md
rm -rf ./mobile/Makefile
rm -rf ./mobile/npm-shrinkwrap.json
rm -rf ./mobile/package.json
rm -rf ./mobile/Procfile
rm -rf ./mobile/README.md
rm -rf ./mobile/.env.oss
rm -rf ./mobile/.gitignore
rm -rf ./mobile/test/mocha.opts

echo "Rewriting relative requires into node modules a directory back..."
find . -type f -name '*.coffee' -exec sed -i s%../node_modules%../../node_modules% {} +
find . -type f -name '*.jade' -exec sed -i s%../node_modules%../../node_modules% {} +
find . -type f -name '*.styl' -exec sed -i s%../node_modules%../../node_modules% {} +

echo "Replacing the root servers with simple express apps..."
echo "express = require('express')" > ./desktop/index.coffee
echo "setup = require './lib/setup'" >> ./desktop/index.coffee
echo "module.exports = app = setup express()" >> ./desktop/index.coffee
echo "express = require('express')" > ./mobile/index.coffee
echo "setup = require './lib/setup'" >> ./mobile/index.coffee
echo "module.exports = app = setup express()" >> ./mobile/index.coffee
echo "app.listen(process.env.PORT, -> process.send? 'listening') if module is require.main" >> ./mobile/index.coffee
sed -i s%index.coffee%mobile/index.coffee% mobile/test/helpers/servers.coffee

echo "Replacing the cache libs with the root cache lib..."
echo "module.exports = require '../../lib/cache'" > ./desktop/lib/cache.coffee
echo "module.exports = require '../../lib/cache'" > ./mobile/lib/cache.coffee

echo "Running tests..."
npm run test

echo "Deploying..."
mkdir public
mkdir public/assets
npm run assets
node_modules/.bin/bucket-assets
heroku config:set ASSET_MANIFEST=$(cat manifest.json) --app=force-merge
rm -rf desktop/public/assets
rm -rf mobile/public/assets
rm -rf public
git add .
git add -f desktop
git add -f mobile
git add -f package.json
git commit -a -m 'deploying'
git push --force git@heroku.com:force-merge.git
