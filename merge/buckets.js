//
// Copies over files from the Force & Microgravity S3 buckets into a new bucket
//
const s3 = require('s3')
const { flatten } = require('underscore')

const {
  S3_KEY,
  S3_SECRET,
  S3_BUCKET,
  OLD_S3_KEY,
  OLD_S3_SECRET
} = process.env

const folders = [
  'video',
  'sounds',
  'pdf',
  'json',
  'javascripts',
  'institution-partnerships',
  'images',
  'icons',
  'gallery-partnerships',
  'fonts',
  'data',
  'auction-partnerships',
  'about'
]

const old = s3.createClient({
  s3Options: {
    accessKeyId: OLD_S3_KEY,
    secretAccessKey: OLD_S3_SECRET
  }
})

const merged = s3.createClient({
  s3Options: {
    accessKeyId: S3_KEY,
    secretAccessKey: S3_SECRET
  }
})

const downloadDir = (dir = folders[0], bucket = 'force-staging') => {
  return new Promise((resolve, reject) => {
    const download = old.downloadDir({
      localDir: `tmp/bucket/${dir}`,
      s3Params: {
        Prefix: dir,
        Bucket: bucket
      }
    }).on('error', reject).on('end', resolve)
  })
}

const download = () => {
  return Promise.all(folders.map((f) => downloadDir(f, 'force-production')))
    .then(() =>
      Promise.all(folders.map((f) => downloadDir(f, 'microgravity-production')))
    )
}

const upload = () => {
  return new Promise((resolve, reject) => {
    const download = merged.uploadDir({
      localDir: 'tmp/bucket',
      s3Params: {
        Bucket: S3_BUCKET,
        ACL: 'public-read'
      }
    }).on('error', reject).on('end', resolve)
  })
}

console.log('Downloading Force & MG buckets...')
download()
  .then(() => console.log('Uploading merged buckets...'))
  .then(upload)
  .then(() => console.log('All done!'))
