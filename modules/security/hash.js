const crypto = require('crypto')

module.exports = (buffer) => {
  return new Promise(resolve => {
    let h

    h = crypto.createHash('sha256')
    h.update(buffer)
    h = h.digest('hex')

    resolve(h)
  })
}