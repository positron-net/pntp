const { compress } = require('./compressor')

module.exports = async (data, peers, callback) => {
  let i = 0
  let part = 0
  let result = []

  while (i < data.length) {
    await compress(data.slice(i, i += data.length / peers)).then(finalBuffer => {
      let fileData = {
        id: part,
        buffer: finalBuffer
      }

      result.push(fileData)
      part++
    })
  }

  callback(result)
}