import { configCrypto, keyFromCertificate, loadPrivateKey, parseCertificate, sign } from '@quiet/identity'
// import fs from 'fs'
// import os from 'os'
import { arrayBufferToString } from 'pvutils'
import { type PeerId } from '@quiet/types'
import { createLogger } from '../../utils/logger'

const logger = createLogger('testHelpers')

const notBeforeDate = new Date(Date.UTC(2010, 11, 28, 10, 10, 10))
const notAfterDate = new Date(Date.UTC(2030, 11, 28, 10, 10, 10))

export const createPeerIdTestHelper = (): PeerId => {
  return {
    id: '12D3KooWNwYB3QhzbowXM4fw78rzceASziFwft1PDGRQZahJMexd',
    pubKey: 'CAESIML+Tv0brHaap504TsJr4CRB6ppSO/KfY/U9qqxakR4+',
  }
}

export const createMessageSignatureTestHelper = async (
  message: string,
  certificate: string,
  userKey: string
): Promise<{ signature: string; pubKey: string }> => {
  const pubKey = keyFromCertificate(parseCertificate(certificate))
  const keyObject = await loadPrivateKey(userKey, configCrypto.signAlg)
  const signatureArrayBuffer = await sign(message, keyObject)
  const signature = arrayBufferToString(signatureArrayBuffer)
  return {
    signature,
    pubKey,
  }
}

export const lastActionReducer = (state: any[] = [], action: any) => {
  state.push(action.type)
  return state
}

// const messagesArr = [] // Replicated messages
// let peersArr = []
// const registrationTime = null // Time of receiving certificate
// let connectionTime = null // Time elasped between receiving certificate and connecting to peers.
// let channelReplicationTime = null // Time elapsed between connectiong to peers and replicating a channel
// let peerNumber = null // Peer number by joining order.

// export const collectDataReducer = (state = [], action: any) => {
//   switch (action.type) {
//     case 'Communities/storePeerList':
//       peerNumber = action.payload.peerList.length - 1
//       break
//     case 'PublicChannels/channelsReplicated':
//       // If you use spam-bot change channel name to channel bot spams on.
//       if (action.payload.channels?.['general']) {
//         const path = `${os.homedir()}/data-${state[0].nickname}.json`
//         channelReplicationTime = getCurrentTime()

//         const data = {
//           peerNumber,
//           connectionTime: connectionTime - registrationTime,
//           channelReplicationTime: channelReplicationTime - connectionTime
//         }

//         const jsonData = JSON.stringify(data)
//         fs.writeFileSync(path, jsonData)
//         // child_process.execSync('aws s3 cp /root/data-*.json s3://connected-peers')
//       }
//       break
//     case 'Identity/registerCertificate':
//       state.push({
//         nickname: action.payload.nickname
//       })
//       break
//     case 'Identity/storeUserCertificate':
//       const certificate = action.payload.userCertificate
//       const parsedCertificate = parseCertificate(certificate)
//       const pubKey = keyFromCertificate(parsedCertificate)
//       state[0].pubKey = pubKey
//       break
//     case 'Connection/addConnectedPeers':
//       logger.info('Adding connected peers', action.payload)
//       peersArr = action.payload
//       connectionTime = getCurrentTime()
//       break
//     case 'Messages/addMessages':
//       const publicKey = state[0].pubKey
//       const messages: ChannelMessage[] = action.payload.messages

//       const path = `${os.homedir()}/data-${state[0].nickname}.json`

//       messages.forEach(message => {
//         if (
//           message.message.startsWith('Created') ||
//           message.message.startsWith('@') ||
//           message.pubKey === publicKey
//         ) { return }

//         const currentTime = getCurrentTime()
//         const delay = currentTime - message.createdAt

//         const data = {
//           [message.id]: delay
//         }

//         messagesArr.push(data)

//         if (messagesArr.length === 1) {
//           const jsonData = JSON.stringify(messagesArr)
//           fs.writeFileSync(path, jsonData)
//           // child_process.execSync('aws s3 cp /root/data-*.json s3://quiet-performance-data')
//         }

//         if (messagesArr.length === 500) {
//           const jsonData = JSON.stringify(messagesArr)
//           fs.writeFileSync(path, jsonData)
//           // child_process.execSync('aws s3 cp /root/data-*.json s3://quiet-performance-data-1-message')
//         }
//       })
//       break
//   }
//   return state
// }

export default {
  createPeerIdTestHelper,
  createMessageSignatureTestHelper,
  lastActionReducer,
  // collectDataReducer
}
