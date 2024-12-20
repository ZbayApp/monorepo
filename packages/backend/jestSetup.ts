import { setEngine, CryptoEngine } from 'pkijs'
import { Crypto } from '@peculiar/webcrypto'

const crypto = new Crypto()
global.crypto = crypto

setEngine(
  'newEngine',
  new CryptoEngine({
    name: 'newEngine',
    // @ts-ignore
    crypto: crypto,
  })
)
