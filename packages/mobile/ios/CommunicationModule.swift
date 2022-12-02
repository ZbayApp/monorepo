@objc(CommunicationModule)
class CommunicationModule: RCTEventEmitter {
  
  static let BACKEND_EVENT_IDENTIFIER = "backend"
  static let NOTIFICATION_EVENT_IDENTIFIER = "notification"
  
  static let WEBSOCKET_CONNECTION_CHANNEL = "_WEBSOCKET_CONNECTION_"
  static let CRYPTO_SERVICE_CONNECTION_CHANNEL = "_CRYPTO_SERVICE_CONNECTION_"
  
  @objc
  func sendDataPort(port: UInt16) {
    self.sendEvent(withName: CommunicationModule.BACKEND_EVENT_IDENTIFIER, body: ["channelName": CommunicationModule.WEBSOCKET_CONNECTION_CHANNEL, "payload": ["dataPort": port]])
  }
  
  @objc
  func sendCryptoPort(port: UInt16) {
    self.sendEvent(withName: CommunicationModule.BACKEND_EVENT_IDENTIFIER, body: ["channelName": CommunicationModule.CRYPTO_SERVICE_CONNECTION_CHANNEL, "payload": ["cryptoPort": port]])
  }
  
  override func supportedEvents() -> [String]! {
    return [CommunicationModule.BACKEND_EVENT_IDENTIFIER, CommunicationModule.NOTIFICATION_EVENT_IDENTIFIER]
  }
}
