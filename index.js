module.exports = {
  network: {
    listener: require('./modules/network/listener.js'),
    sender: require('./modules/network/sender.js')
  },

  security: {
    hash: require('./modules/security/hash.js'),
    encrypt: require('./modules/security/encrypt.js'),
    decrypt: require('./modules/security/decrypt.js')
  },

  files: {
    split: require('./modules/files/split.js'),
    merge: require('./modules/files/merge.js'),
    compress: require('./modules/files/compress.js'),
    decompress: require('./modules/files/decompress.js')
  }
}