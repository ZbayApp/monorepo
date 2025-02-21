import { type KeyValueType, type EventsType } from '@orbitdb/core'
import { EventEmitter } from 'events'
import { createLogger } from '../common/logger'

const logger = createLogger('store')

abstract class StoreBase<V, S extends KeyValueType<V> | EventsType<V>> extends EventEmitter {
  protected abstract store: S | undefined

  getStore() {
    if (!this.store) {
      throw new Error('Store not initialized')
    }
    return this.store
  }

  getAddress(): string {
    return this.getStore().address
  }

  async close(): Promise<void> {
    logger.info('Closing', this.getAddress())
    await this.getStore().close()
    logger.info('Closed', this.getAddress())
  }

  abstract init(...args: any[]): Promise<void> | Promise<StoreBase<V, S>>
  abstract clean(): void
}

export abstract class KeyValueStoreBase<V, U = V> extends StoreBase<V, KeyValueType<V>> {
  protected store: KeyValueType<V> | undefined
  abstract setEntry(key: string, value: U): Promise<V>
  abstract getEntry(key?: string): Promise<U | null>
}

export abstract class EventStoreBase<V, U = V> extends StoreBase<V, EventsType<V>> {
  protected store: EventsType<V> | undefined
  abstract addEntry(value: U): Promise<string>
  abstract getEntries(): Promise<U[]>
}
