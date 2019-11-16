module.exports = {
  network: {
    listener: require('./modules/network/listener.js'),
    sender: require('./modules/network/sender.js'),
  },

  security: {
    hash: require('./modules/security/hash.js'),
    aes: require('./modules/security/aes.js')
  },

  files: {
    split: require('./modules/files/split.js'),
    merge: require('./modules/files/merge.js'),
    compressor: require('./modules/files/compressor.js')
  }
}