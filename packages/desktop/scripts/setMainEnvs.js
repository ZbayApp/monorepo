const fs = require('fs')
const path = require('path')

const envs = JSON.stringify({
  TEST_MODE: process.env.TEST_MODE,
  COLORIZE: true
})
console.log('Saving extra envs for main process:', envs)
fs.writeFileSync(path.join('mainEnvs.json'), envs)
