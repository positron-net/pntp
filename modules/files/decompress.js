const snappy = require('snappy')

module.exports = (buffer) => {
  return new Promise((resolve, reject) => {
    const isValid = snappy.isValidCompressedSync(buffer)
  
    if (isValid) {
      snappy.uncompress(buffer, (err, data) => {
        if (err) reject(err)
        resolve(data)
      })
    } else {
      reject('invalid buffer')
    }
  })
}