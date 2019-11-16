const utp = require('./utp') // utp lib
const { encode } = require('./coder')

module.exports = (address, port, action, content, password) => {
  return new Promise((resolve, reject) => {
    const sender = utp.connect(port, address) // connect to the peer

    // create message
    const message = {
      action: action,
      content: content
    }

    // encode content
    encode(message.content, password)
    .then(encodedContent => {
      message.content = encodedContent // update content
      sender.write(JSON.stringify(message)) // send data

      // return peer' address and port
      resolve({
        ip: address,
        port: port
      })
    })
    .catch(err => reject(err))
  })
}