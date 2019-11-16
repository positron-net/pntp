const utp = require('./utp')
const { decode } = require('./coder')

module.exports = (port, ondata, password) => {
  const listener = utp.createServer(socket => {
    console.log(`[LISTENER] > new connection from [${socket.host}:${socket.port}]`)
    socket.on('data', data => {
      data = JSON.parse(data)

      decode(data.content, password)
      .then(decodedContent => {
        data.content = decodedContent
        ondata(data)
      })
      .catch(err => console.log(err))
    })
  })

  listener.listen(port, () => {
    console.log(`[LISTENER] > listening on ${port}...`)
  })
}