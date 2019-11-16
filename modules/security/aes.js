const crypto = require('crypto')
const aesjs = require('aes-js')

const generateKey = password => {
  return aesjs.utils.hex.toBytes(crypto.createHash('sha256').update(password).digest('hex'))
}

module.exports = {
  encrypt (text, password) {
    return new Promise(resolve => {
      const key = generateKey(password)
      
      const aesCtr = new aesjs.ModeOfOperation.ctr(key, new aesjs.Counter(5))
      const encrypted = aesCtr.encrypt(text)

      resolve(aesjs.utils.hex.fromBytes(encrypted))
    })
  },

  decrypt (text, password) {
    return new Promise(resolve => {
      const key = generateKey(password)
      
      const aesCtr = new aesjs.ModeOfOperation.ctr(key, new aesjs.Counter(5))
      const decrypted = aesCtr.decrypt(text)

      resolve(aesjs.utils.utf8.fromBytes(decrypted))
    })
  }
}