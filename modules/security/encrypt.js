const crypto = require('crypto')

module.exports = (buffer, password) => {
  return new Promise(resolve => {
    const cipher = crypto.createCipher('aes-256-ctr', password)
    const crypted = Buffer.concat([cipher.update(buffer),cipher.final()])

    resolve(crypted)
  })
}