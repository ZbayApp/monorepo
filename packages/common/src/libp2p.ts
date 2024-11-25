import validator from 'validator'
export const PSK_LENGTH = 44 // PSK is 256 bits/8 = 32 bytes which encodes to 44 characters base64

const ONION = '.onion'

export const createLibp2pAddress = (address: string, peerId: string) => {
  if (!address.endsWith(ONION)) address += ONION
  if (address.length !== 56 + ONION.length) {
    if (process.env.NODE_ENV !== 'test')
      throw new Error(`Invalid address: ${address} length: ${address.length} expected: ${56 + ONION.length}`)
    console.warn(`Invalid address: ${address} length: ${address.length} expected: ${56 + ONION.length}`)
  }
  return `/dns4/${address}/tcp/80/ws/p2p/${peerId}`
}

export const createLibp2pListenAddress = (address: string) => {
  if (!address.endsWith(ONION)) address += ONION
  if (address.length !== 56 + ONION.length) {
    if (process.env.NODE_ENV !== 'test')
      throw new Error(`Invalid address: ${address} length: ${address.length} expected: ${56 + ONION.length}`)
    console.warn(`Invalid address: ${address} length: ${address.length} expected: ${56 + ONION.length}`)
  }
  return `/dns4/${address}/tcp/80/ws`
}

export const isPSKcodeValid = (psk: string): boolean => {
  const _psk = psk.trim()
  return validator.isBase64(_psk) && _psk.length === PSK_LENGTH
}

export const filterValidAddresses = (addresses: string[]) => {
  return addresses.filter(add => add.match(/^\/dns4\/[a-z0-9]{56}.onion\/tcp\/(443|80)\/ws\/p2p\/[a-zA-Z0-9]{46}$/g))
}
