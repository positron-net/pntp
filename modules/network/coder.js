const snappy = require('snappy')

module.exports = {
  encode (message) {
    return new Promise((resolve, reject) => {
      message = JSON.stringify(message)
      snappy.compress(message, (err, compressed) => {
        if (err) reject(err)
        resolve(compressed)
      })
    })
  },

  decode (buffer) {
    return new Promise((resolve, reject) => {
      snappy.uncompress(buffer, (err, original) => {
        if (err) reject(err)

        original = JSON.parse(original.toString())

        resolve(original)
      })
    })
  }
}