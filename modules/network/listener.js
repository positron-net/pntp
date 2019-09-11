const utp = require('./utp')
const coder = require('./coder')

module.exports = (port, ondata) => {
  const listener = utp.createServer(socket => {
    console.log(`[LISTENER] > new connection from [${socket.host}:${socket.port}]`)
    socket.on('data', data => {
      coder.decode(data)
      .then(result => ondata(result))
      .catch(err => {
        console.log(err)
      })
    })
  })

  listener.listen(port, () => {
    console.log(`[LISTENER] > listening on ${port}...`)
  })
}