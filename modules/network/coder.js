const { compress, decompress } = require('../files/compressor')
const { encrypt, decrypt } = require('../security/aes')

module.exports = {
  encode (content, password) {
    return new Promise((resolve, reject) => {
      // compress it
      compress(content)
      .then(compressedContent => {
        content = compressedContent // update the content in the object
        // if a password is given
        if (password) {
          // encrypt the content of the message
          encrypt(content, password)
          .then(encryptedContent => {
            content = encryptedContent // update the content in the object
            resolve(JSON.stringify(content)) // send the request
          })
          .catch(err => console.log(err)) // if an error happen, retun it
        } else {
          resolve(JSON.stringify(content)) // send the request
        }
      })
      .catch(err => console.log(err)) // if an error happen, retun it
    })
  },

  decode (content, password) {
    return new Promise((resolve, reject) => {
      content = Buffer.from(JSON.parse(content))
        // if a password is given
        if (password) {
          // decrypt the content of the message
          decrypt(content, password)
          .then(decryptedContent => {
            console.log(decryptedContent)
            // decompress it
            decompress(decryptedContent)
            .then(decompressedContent => {
              content = Buffer.from(decompressedContent).toString()
              resolve(content) // return it
            })
            .catch(err => console.log(err))
          })
          .catch(err => console.log(err)) // if an error happen, retun it
        } else {
          decompress(content)
          .then(decompressedContent => {
            content = Buffer.from(decompressedContent).toString()
            resolve(content)
          })
          .catch(err => console.log(err))
        }
    })
  }
}