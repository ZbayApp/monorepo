/**
 * Forked from:
 * https://github.com/orbitdb/orbitdb/blob/9ddffd346a26937902cacf0a33ee8210bdc637a0/src/databases/keyvalue-indexed.js
 *
 * Adds validation function that validates each entry before adding it to the
 * index. This is used to validate each entry in OrbitDB upon retrieval (vs
 * write). In the latest version of OrbitDB, access controllers now validate
 * each entry, but there might still be other reasons why we would want to
 * continue using this (e.g. flexibility in how we treat "invalid" data).
 */

/**
 * @namespace Databases-KeyValueIndexed
 * @memberof module:Databases
 * @description
 * Key-Value database that uses an index in order to provide fast queries.
 *
 * Key-value pairs are stored to the configured storage.
 * @example <caption>Specify a custom storage</caption>
 * import { createHelia } from 'helia'
 * import { createOrbitDB, KeyValueIndexed, IPFSBlockStorage } from 'orbitdb'
 *
 * const ipfs = createHelia()
 * const storage = await IPFSBlockStorage({ ipfs })
 * const orbitdb = await createOrbitDB({ ipfs })
 * const db = await orbitdb.open('my-kv', { Database: KeyValueIndexed({ storage }) })
 *
 * @augments module:Databases~Database
 * @augments module:Databases.Databases-KeyValue
 */
import {
  AccessControllerType,
  KeyValue,
  LevelStorage,
  IdentitiesType,
  LogEntry,
  KeyValueType,
  LogType,
} from '@orbitdb/core'
import { type Helia } from 'helia'
import { toString as uint8ArrayToString } from 'uint8arrays/to-string'
import { createLogger } from '../../common/logger'
import { KeyValueWithStorage } from './keyValueWithStorage'

import { posixJoin } from './util'

type ValidateFn<T> = (entry: LogEntry<T>) => Promise<boolean>

const valueEncoding = 'json'

const logger = createLogger('orbitdb:keyValueIndexedValidated')

/**
 * Defines an index for a KeyValue database.
 * @param {string} [directory] A location for storing the index-related data
 * @return {Index} A Index function.
 */
const Index =
  ({ directory, validateFn }: { directory?: string; validateFn?: ValidateFn<any> } = {}) =>
  async () => {
    const index = await LevelStorage({ path: directory ?? undefined, valueEncoding })
    const indexedEntries = await LevelStorage({
      path: posixJoin(directory ?? './level', '/_indexedEntries/'),
      valueEncoding,
    })

    const update = async (log: LogType, entry: LogEntry) => {
      const keys = new Set()
      const toBeIndexed = new Set()
      const latest = entry.hash

      // Function to check if a hash is in the entry index
      const isIndexed = async (hash: string) => (await indexedEntries.get(hash)) === true
      const isNotIndexed = async (hash: string) => !(await isIndexed(hash))

      // Function to decide when the log traversal should be stopped
      const shoudStopTraverse = async (entry: LogEntry) => {
        // Go through the nexts of an entry and if any is not yet
        // indexed, add it to the list of entries-to-be-indexed
        for await (const hash of entry.next) {
          if (await isNotIndexed(hash)) {
            toBeIndexed.add(hash)
          }
        }
        // If the latest entry and all its nexts are indexed and to-be-indexed list is empty,
        // we don't have anything more to process, so return true to stop the traversal
        return (await isIndexed(latest)) && toBeIndexed.size === 0
      }

      // Traverse the log and stop when everything has been processed
      for await (const entry of log.traverse(null, shoudStopTraverse)) {
        const { hash, payload } = entry
        // If an entry is not yet indexed, process it
        if (await isNotIndexed(hash)) {
          const { op, key } = payload
          const isValid = validateFn ? await validateFn(entry) : true
          if (op === 'PUT' && !keys.has(key) && isValid) {
            keys.add(key)
            await index.put(key as string, encodeEntry(entry))
            await indexedEntries.put(hash, true)
          } else if (op === 'DEL' && !keys.has(key) && isValid) {
            keys.add(key)
            await index.del(key as string)
            await indexedEntries.put(hash, true)
          }
          // Remove the entry (hash) from the list of to-be-indexed entries
          toBeIndexed.delete(hash)
        }
      }
    }

    /**
     * Closes the index and its storages.
     */
    const close = async () => {
      await index.close()
      await indexedEntries.close()
    }

    /**
     * Drops all records from the index and its storages.
     */
    const drop = async () => {
      await index.clear()
      await indexedEntries.clear()
    }

    const encodeEntry = (entry: LogEntry): any => {
      switch (valueEncoding as string) {
        case 'buffer':
          return Buffer.from(JSON.stringify(entry))
        case 'view':
          return Buffer.from(JSON.stringify(entry))
        case 'json':
          return entry
        case 'utf8':
          return JSON.stringify(entry)
        default:
          throw new Error(`Don't know how to handle the encoding ${valueEncoding}`)
      }
    }

    const decodeEntry = (entryBuffer: Uint8Array) => {
      return JSON.parse(uint8ArrayToString(entryBuffer, 'utf8'))
    }

    return {
      get: index.get,
      iterator: index.iterator,
      update,
      close,
      drop,
    }
  }

/**
 * Defines a KeyValueIndexed database.
 * @param {module:Storage} [storage=LevelStorage] A compatible storage where
 * the key/value pairs are indexed.
 * @return {module:Databases.Databases-KeyValueIndexed} A KeyValueIndexed
 * function.
 * @memberof module:Databases
 */
export const KeyValueIndexedValidated =
  (validateFn?: ValidateFn<any>) =>
  async ({
    ipfs,
    identity,
    address,
    name,
    access,
    directory,
    meta,
    referencesCount,
    syncAutomatically,
    onUpdate,
  }: {
    ipfs: Helia
    identity: IdentitiesType
    address: string
    name: string
    access: AccessControllerType
    directory: string
    meta: Record<string, any>
    referencesCount: number
    syncAutomatically: boolean
    onUpdate: (log: LogType, entry: LogEntry) => Promise<void>
  }) => {
    // Set up the index
    const index = await Index({ directory: posixJoin(directory || './orbitdb', `./${address}/_index`), validateFn })()

    // Set up the underlying KeyValue database
    const keyValueStore: KeyValueType = await KeyValueWithStorage()({
      ipfs,
      identity,
      address,
      name,
      access,
      directory,
      meta,
      referencesCount,
      syncAutomatically,
      onUpdate: index.update,
    })

    /**
     * Gets a value from the store by key.
     * @function
     * @param {string} key The key of the value to get.
     * @return {*} The value corresponding to key or null.
     * @memberof module:Databases.Databases-KeyValueIndexed
     * @instance
     */
    const get = async (key: string) => {
      const entry = await index.get(key)
      if (entry) {
        return entry.payload.value
      }
    }

    /**
     * Iterates over keyvalue pairs.
     * @function
     * @param {Object} [filters={}] Various filters to apply to the iterator.
     * @param {string} [filters.amount=-1] The number of results to fetch.
     * @yields [string, string, string] The next key/value as key/value/hash.
     * @memberof module:Databases.Databases-KeyValueIndexed
     * @instance
     */
    const iterator = async function* ({ amount }: { amount?: number } = {}) {
      const it = index.iterator({ amount, reverse: true })
      for await (const record of it) {
        // 'index' is a LevelStorage that returns a [key, value] pair
        const entry = record[1]
        const { key, value } = entry.payload
        const hash = entry.hash
        yield { key, value, hash }
      }
    }

    /**
     * Closes the index and underlying storage.
     */
    const close = async () => {
      await keyValueStore.close()
      await index.close()
    }

    /**
     * Drops all records from the index and underlying storage.
     */
    const drop = async () => {
      await keyValueStore.drop()
      await index.drop()
    }

    return {
      ...keyValueStore,
      get,
      iterator,
      close,
      drop,
    }
  }

KeyValueIndexedValidated.type = 'KeyValueIndexedValidated'
