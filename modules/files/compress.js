const snappy = require('snappy')

module.exports = (buffer) => {
  return new Promise((resolve, reject) => {
    snappy.compress(buffer, (err, data) => {
      if (err) reject(err)
      resolve(data)
    })
  })
}