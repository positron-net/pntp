const os = process.platform
const username = require("os").userInfo().username

const platforms = [
  {name: 'win32', path: `c:/Users/${username}/AppData/Roaming/positron`},
  {name: 'linux', path: `/home/${username}/.config/positron`},
  {name: 'darwin', path: `/Users/${username}/Library/Application Support/positron`}
]

module.exports = () => {
  return new Promise(resolve => {
    for (i in platforms) {
      if (platforms[i].name === os) {
        resolve(platforms[i].path)
        break
      }
    }
  })
}