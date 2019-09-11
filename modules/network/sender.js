const utp = require('./utp')
const coder = require('./coder')

module.exports = (address, port, action, content) => {
  return new Promise((resolve, reject) => {

    const sender = utp.connect(port, address)
    const message = {
      action: action,
      content: content
    }
  
    coder.encode(message)
    .then(result => {
      sender.write(result)
      resolve({
        ip: address,
        port: port
      })
    })
    .catch(err => reject(err))

  })
}