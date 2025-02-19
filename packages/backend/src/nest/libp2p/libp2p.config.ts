import { gossipsub } from '@chainsafe/libp2p-gossipsub'
import { identify, identifyPush } from '@libp2p/identify'
import { Libp2pOptions } from 'libp2p'
import { FaultTolerance } from '@libp2p/interface-transport'
import { kadDHT } from '@libp2p/kad-dht'
import { mplex } from '@libp2p/mplex'
import { ping } from '@libp2p/ping'
import { preSharedKey } from '@libp2p/pnet'
import { Libp2pAuth, Libp2pAuthComponents } from './libp2p.auth'
import { WEBSOCKET_CIPHER_SUITE } from './libp2p.const'
import { Libp2pDatastore } from './libp2p.datastore'
import { Libp2pNodeParams } from './libp2p.types'
import { keychain } from '@libp2p/keychain'
import { webSockets as webSocketsOverTor } from '../websocketOverTor'
import * as filters from '@libp2p/websockets/filters'
import { webSockets } from '@libp2p/websockets'

export const generateServerLibp2pConfig = (
  params: Libp2pNodeParams,
  datastore: Libp2pDatastore,
  libp2pAuth: (components: Libp2pAuthComponents) => Libp2pAuth
): Libp2pOptions => {
  const transport = webSockets({
    filter: filters.all,
    websocket: {
      agent: params.agent,
      handshakeTimeout: 30_000,
      ciphers: WEBSOCKET_CIPHER_SUITE,
      followRedirects: true,
      localAddress: params.localAddress,
    },
    inboundConnectionUpgradeTimeout: 30_000,
    closeOnEnd: false,
  })

  return generateLibp2pConfig(
    {
      ...params,
      transport: [transport],
    },
    datastore,
    libp2pAuth
  )
}

export const generatePeerLibp2pConfig = (
  params: Libp2pNodeParams,
  datastore: Libp2pDatastore,
  libp2pAuth: (components: Libp2pAuthComponents) => Libp2pAuth
): Libp2pOptions => {
  const transport = webSocketsOverTor({
    filter: filters.all,
    websocket: {
      agent: params.agent,
      handshakeTimeout: 30_000,
      ciphers: WEBSOCKET_CIPHER_SUITE,
      followRedirects: true,
    },
    localAddress: params.localAddress,
    targetPort: params.targetPort,
    inboundConnectionUpgradeTimeout: 30_000,
    closeOnEnd: false,
  })

  return generateLibp2pConfig(
    {
      ...params,
      transport: [transport],
    },
    datastore,
    libp2pAuth
  )
}

const generateLibp2pConfig = (
  params: Libp2pNodeParams,
  datastore: Libp2pDatastore,
  libp2pAuth: (components: Libp2pAuthComponents) => Libp2pAuth
): Libp2pOptions => {
  return {
    start: false,
    datastore: datastore.getDatastoreInstance(),
    connectionManager: {
      maxConnections: 20, // TODO: increase?
      dialTimeout: 120_000,
      maxParallelDials: 10,
      inboundUpgradeTimeout: 30_000,
      outboundUpgradeTimeout: 30_000,
      protocolNegotiationTimeout: 10_000,
      maxDialQueueLength: 500,
      reconnectRetries: 25,
    },
    privateKey: params.peerId.privKey,
    addresses: { listen: params.listenAddresses },
    connectionMonitor: {
      // ISLA: we should consider making this true if pings are reliable going forward
      abortConnectionOnPingFailure: false,
      pingInterval: 60_000,
      enabled: true,
    },
    connectionProtector:
      params.useConnectionProtector || params.useConnectionProtector == null
        ? preSharedKey({ psk: params.psk })
        : undefined,
    streamMuxers: [
      mplex({
        disconnectThreshold: 20,
        maxInboundStreams: 1024,
        maxOutboundStreams: 1024,
        maxStreamBufferSize: 26214400,
        maxUnprocessedMessageQueueSize: 104857600,
        maxMsgSize: 10485760,
        // @ts-expect-error This is part of the config interface but it isn't typed that way
        closeTimeout: 15_000,
      }),
    ],
    // @ts-ignore
    connectionEncrypters: [noise({ crypto: pureJsCrypto, staticNoiseKey: params.peerId.noiseKey })],
    transports: params.transport!,
    transportManager: {
      faultTolerance: FaultTolerance.NO_FATAL,
    },
    services: {
      auth: libp2pAuth,
      ping: ping({ timeout: 30_000 }),
      pubsub: gossipsub({
        // neccessary to run a single peer
        allowPublishToZeroTopicPeers: true,
        fallbackToFloodsub: false,
        emitSelf: true,
        debugName: params.peerId.peerId.toString(),
        doPX: true,
      }),
      identify: identify({ timeout: 30_000, maxInboundStreams: 128, maxOutboundStreams: 128 }),
      identifyPush: identifyPush({ timeout: 30_000, maxInboundStreams: 128, maxOutboundStreams: 128 }),
      keychain: keychain(),
      dht: kadDHT({
        allowQueryWithZeroPeers: true,
        clientMode: false,
        initialQuerySelfInterval: 500,
        providers: {
          cacheSize: 1024,
        },
        maxInboundStreams: 128,
        maxOutboundStreams: 128,
      }),
    },
  }
}
