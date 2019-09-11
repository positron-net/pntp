const crypto = require('crypto')

module.exports = (buffer, password) => {
  return new Promise(resolve => {
    const decipher = crypto.createDecipher('aes-256-ctr', password)
    const dec = Buffer.concat([decipher.update(buffer), decipher.final()])

    resolve(dec)
  })
}