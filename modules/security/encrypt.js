const crypto = require('crypto')
const hash = require('./hash.js')

module.exports = (text, password) => {
  return new Promise(resolve => {
    hash(password).then(pass => {
      pass = pass.slice(32)
      let iv = crypto.randomBytes(16)
      let cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(pass), iv)
      let encrypted = cipher.update(text)
      encrypted = Buffer.concat([encrypted, cipher.final()])

      resolve(`${iv.toString('hex')}::${encrypted.toString('hex')}`)
    })
  })
}