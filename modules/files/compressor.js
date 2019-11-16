const snappy = require('snappy')

module.exports = {
  compress (buffer) {
    return new Promise((resolve, reject) => {
      snappy.compress(buffer, (err, compressed) => {
        if (err) reject(err)
        resolve(compressed)
      })
    })
  },

  decompress (buffer) {
    return new Promise((resolve, reject) => {
      const isValid = snappy.isValidCompressedSync(buffer)
    
      if (isValid) {
        snappy.uncompress(buffer, (err, data) => {
          if (err) reject(err)
          resolve(data)
        })
      } else {
        reject(buffer)
      }
    })
  }
}