import * as Block from 'multiformats/block'
import * as dagCbor from '@ipld/dag-cbor'
import { sha256 } from 'multiformats/hashes/sha2'
import { base58btc } from 'multiformats/bases/base58'
import {
  type Storage,
  type OrbitDBType,
  type LogEntry,
  type IdentitiesType,
  ComposedStorage,
  LRUStorage,
  IPFSBlockStorage,
} from '@orbitdb/core'
import { getCrypto } from 'pkijs'
import { stringToArrayBuffer } from 'pvutils'
import { keyObjectFromString, verifySignature } from '@quiet/identity'
import { ChannelMessage, NoCryptoEngineError } from '@quiet/types'
import { posixJoin } from './util'

const codec = dagCbor
const hasher = sha256
const hashStringEncoding = base58btc

const AccessControlList = async ({
  storage,
  type,
  params,
}: {
  storage: Storage
  type: string
  params: Record<string, any>
}) => {
  const manifest = {
    type,
    ...params,
  }
  const { cid, bytes } = await Block.encode({ value: manifest, codec, hasher })
  const hash = cid.toString(hashStringEncoding)
  await storage.put(hash, bytes)
  return hash
}

const type = 'messagesaccess'

export const MessagesAccessController =
  ({ write }: { write: string[] }) =>
  async ({ orbitdb, identities, address }: { orbitdb: OrbitDBType; identities: IdentitiesType; address: string }) => {
    const storage = await ComposedStorage(
      await LRUStorage({ size: 1000 }),
      await IPFSBlockStorage({ ipfs: orbitdb.ipfs, pin: true })
    )
    write = write || [orbitdb.identity.id]

    if (address) {
      const manifestBytes = await storage.get(address.replaceAll('/ipfs/', ''))
      const { value } = await Block.decode({ bytes: manifestBytes, codec, hasher })
      // FIXME: Figure out typings
      // @ts-ignore
      write = value.write
    } else {
      address = await AccessControlList({ storage, type, params: { write } })
      address = posixJoin('/', type, address)
    }

    const crypto = getCrypto()
    const keyMapping: Map<string, CryptoKey> = new Map()

    const canAppend = async (entry: LogEntry<ChannelMessage>) => {
      if (!crypto) throw new NoCryptoEngineError()

      const writerIdentity = await identities.getIdentity(entry.identity)
      if (!writerIdentity) {
        return false
      }

      const { id } = writerIdentity
      if (write.includes(id) || write.includes('*')) {
        if (!identities.verifyIdentity(writerIdentity)) {
          return false
        }
      } else {
        return false
      }

      const message = entry.payload.value

      if (message) {
        const signature = stringToArrayBuffer(message.signature)
        let cryptoKey = keyMapping.get(message.pubKey)

        if (!cryptoKey) {
          cryptoKey = await keyObjectFromString(message.pubKey, crypto)
          keyMapping.set(message.pubKey, cryptoKey)
        }

        return await verifySignature(signature, message.message, cryptoKey)
      } else {
        return true
      }
    }

    return {
      type,
      address,
      write,
      canAppend,
    }
  }

MessagesAccessController.type = type
