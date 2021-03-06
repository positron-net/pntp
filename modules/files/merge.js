const { decompress } = require('./compressor')

module.exports = async (buffers, callback) => {
  let file = []

  for (i in buffers) {
    await decompress(buffers[i].buffer).then(dc => {
      file.push(dc)
    })
  }

  callback(Buffer.concat(file))
}