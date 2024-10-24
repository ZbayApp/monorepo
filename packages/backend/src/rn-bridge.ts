import { emit } from 'process'
import { createLogger } from './nest/common/logger'

const EventEmitter = require('events')

const logger = createLogger('rnBridge')

const initRnBridge = () => {
  // @ts-ignore
  const NativeBridge = process._linkedBinding('rn_bridge')

  /**
   * Built-in events channel to exchange events between the react-native app
   * and the Node.js app. It allows to emit user defined event types with
   * optional arguments.
   */
  const EVENT_CHANNEL = '_EVENTS_'

  /**
   * Built-in, one-way event channel reserved for sending events from
   * the react-native plug-in native layer to the Node.js app.
   */
  const SYSTEM_CHANNEL = '_SYSTEM_'

  /**
   * This class is defined in the plugin's root index.js as well.
   * Any change made here should be ported to the root index.js too.
   * The MessageCodec class provides two static methods to serialize/deserialize
   * the data sent through the events channel.
   */
  class MessageCodec {
    event: string
    payload: string
    // This is a 'private' constructor, should only be used by this class
    // static methods.
    constructor(_event: string, ..._payload: string[]) {
      this.event = _event
      this.payload = JSON.stringify(_payload)
    }

    // Serialize the message payload and the message.
    static serialize(event: string, ...payload: string[]) {
      const envelope = new MessageCodec(event, ...payload)
      // Return the serialized message, that can be sent through a channel.
      return JSON.stringify(envelope)
    }

    static parsePayload(message: string) {
      logger.warn('rn-bridge payload', message)
      const parsed: { [key: string]: string } = {}
      const entries = message.split('|')
      if (entries.length < 1) {
        logger.warn('Malformed or non-existent rn-bridge payload ', entries)
        return parsed
      }
      entries.forEach(s => {
        const split = s.split(':')
        if (split.length !== 2) {
          logger.warn('Malformed rn-bridge entry: ', split)
          return
        }
        parsed[split[0]] = split[1]
      })

      logger.info('parsed', parsed)
      return parsed
    }

    // Deserialize the message and the message payload.
    static deserialize(message: string) {
      const envelope = JSON.parse(message)
      envelope.payload = this.parsePayload(envelope.payload)
      return envelope
    }
  }

  /**
   * Channel super class.
   */
  class ChannelSuper extends EventEmitter {
    constructor(name: string) {
      super()
      this.name = name

      // Renaming the 'emit' method to 'emitLocal' is not strictly needed, but
      // it is useful to clarify that 'emitting' on this object has a local
      // scope: it emits the event on the react-native side only, it doesn't send
      // the event to Node.
      this.emitLocal = this.emit

      delete this.emit
    }

    emitWrapper(type: string, ...msg: string[]) {
      // eslint-disable-next-line
      const _this = this
      setImmediate(() => {
        _this.emitLocal(type, ...msg)
      })
    }
  }

  /**
   * Events channel class that supports user defined event types with
   * optional arguments. Allows to send any serializable
   * JavaScript object supported by 'JSON.stringify()'.
   * Sending functions is not currently supported.
   * Includes the previously available 'send' method for 'message' events.
   */
  class EventChannel extends ChannelSuper {
    post(event: string, ...msg: string[]) {
      NativeBridge.sendMessage(this.name, MessageCodec.serialize(event, ...msg))
    }

    // Posts a 'message' event, to be backward compatible with old code.
    send(...msg: string[]) {
      this.post('message', ...msg)
    }

    processData(data: string) {
      // The data contains the serialized message envelope.
      const envelope = MessageCodec.deserialize(data)
      setImmediate(() => {
        this.emitLocal(envelope.event, envelope.payload)
      })
    }
  }

  /**
   * System event Lock class
   * Helper class to handle lock acquisition and release in system event handlers.
   * Will call a callback after every lock has been released.
   **/
  class SystemEventLock {
    _locksAcquired: any
    _callback: any
    _hasReleased: boolean
    constructor(callback: () => any, startingLocks: any) {
      this._locksAcquired = startingLocks // Start with one lock.
      this._callback = callback // Callback to call after all locks are released.
      this._hasReleased = false // To stop doing anything after it's supposed to serve its purpose.
      this._checkRelease() // Initial check. If it's been started with no locks, can be released right away.
    }
    // Release a lock and call the callback if all locks have been released.
    release() {
      if (this._hasReleased) return
      this._locksAcquired--
      this._checkRelease()
    }
    // Check if the lock can be released and release it.
    _checkRelease() {
      if (this._locksAcquired <= 0) {
        this._hasReleased = true
        this._callback()
      }
    }
  }

  /**
   * System channel class.
   * Emit pause/resume events when the app goes to background/foreground.
   */
  class SystemChannel extends ChannelSuper {
    constructor(name: string) {
      super(name)
      // datadir should not change during runtime, so we cache it.
      this._cacheDataDir = null
    }

    emitWrapper(type: string) {
      // Overload the emitWrapper to handle the pause event locks.
      // eslint-disable-next-line
      const _this = this
      if (type.startsWith('pause')) {
        setImmediate(() => {
          let releaseMessage = 'release-pause-event'
          const eventArguments = type.split('|')
          if (eventArguments.length >= 2) {
            // The expected format for the release message is "release-pause-event|{eventId}"
            // eventId comes from the pause event, with the format "pause|{eventId}"
            releaseMessage = releaseMessage + '|' + eventArguments[1]
          }
          // Create a lock to signal the native side after the app event has been handled.
          const eventLock = new SystemEventLock(
            () => {
              NativeBridge.sendMessage(_this.name, releaseMessage)
            },
            _this.listenerCount('pause') // A lock for each current event listener. All listeners need to call release().
          )
          _this.emitLocal('pause', eventLock)
        })
      } else {
        setImmediate(() => {
          _this.emitLocal(type)
        })
      }
    }

    processData(data: string) {
      // The data is the event.
      this.emitWrapper(data)
    }

    // Get a writable data directory for persistent file storage.
    datadir() {
      if (this._cacheDataDir === null) {
        this._cacheDataDir = NativeBridge.getDataDir()
      }
      return this._cacheDataDir
    }
  }

  const channels: { [key: string]: SystemChannel | EventChannel } = {}
  /**
   * Manage the registered channels to emit events/messages received by the
   * react-native app or by the react-native plugin itself (i.e. the system channel).
   */

  /*
   * This method is invoked by the native code when an event/message is received
   * from the react-native app.
   */
  function bridgeListener(channelName: string, data: string) {
    // eslint-disable-next-line
    if (channels.hasOwnProperty(channelName)) {
      channels[channelName].processData(data)
    } else {
      logger.error('ERROR: Channel not found:', channelName)
    }
  }

  /*
   * The bridge's native code processes each channel's messages in a dedicated
   * per-channel queue, therefore each channel needs to be registered within
   * the native code.
   */
  function registerChannel(channel: SystemChannel | EventChannel) {
    channels[channel.name] = channel
    NativeBridge.registerChannel(channel.name, bridgeListener)
  }

  /**
   * Module exports.
   */
  const systemChannel = new SystemChannel(SYSTEM_CHANNEL)
  registerChannel(systemChannel)

  // Signal we are ready for app events, so the native code won't lock before node is ready to handle those.
  NativeBridge.sendMessage(SYSTEM_CHANNEL, 'ready-for-app-events')

  const eventChannel = new EventChannel(EVENT_CHANNEL)
  registerChannel(eventChannel)

  return {
    app: systemChannel,
    channel: eventChannel,
  }
}
export default initRnBridge
