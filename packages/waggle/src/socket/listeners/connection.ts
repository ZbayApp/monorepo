import {
  AskForMessagesPayload,
  InitCommunityPayload,
  LaunchRegistrarPayload,
  RegisterOwnerCertificatePayload,
  RegisterUserCertificatePayload,
  SaveOwnerCertificatePayload,
  SocketActionTypes,
  SubscribeToTopicPayload
} from '@zbayapp/nectar'
import { IMessage } from '../../common/types'
import IOProxy from '../IOProxy'

import logger from '../../logger'

const log = logger('socket')

export const connections = (io, ioProxy: IOProxy) => {
  io.on(SocketActionTypes.CONNECTION, socket => {
    log('websocket connected')
    socket.on(SocketActionTypes.CLOSE, async () => {
      await ioProxy.closeAll()
    })
    socket.on(SocketActionTypes.SUBSCRIBE_TO_TOPIC, async (payload: SubscribeToTopicPayload) => {
      await ioProxy.subscribeToTopic(payload)
    })
    socket.on(
      SocketActionTypes.SEND_MESSAGE,
      async (
        peerId: string,
        { channelAddress, message }: { channelAddress: string; message: IMessage }
      ) => {
        await ioProxy.sendMessage(peerId, channelAddress, message)
      }
    )
    socket.on(
      SocketActionTypes.INITIALIZE_CONVERSATION,
      async (
        peerId: string,
        { address, encryptedPhrase }: { address: string; encryptedPhrase: string }
      ) => {
        await ioProxy.initializeConversation(peerId, address, encryptedPhrase)
      }
    )
    socket.on(SocketActionTypes.GET_PRIVATE_CONVERSATIONS, async (peerId: string) => {
      await ioProxy.getPrivateConversations(peerId)
    })
    socket.on(
      SocketActionTypes.SEND_DIRECT_MESSAGE,
      async (
        peerId: string,
        { channelAddress, message }: { channelAddress: string; message: string }
      ) => {
        await ioProxy.sendDirectMessage(peerId, channelAddress, message)
      }
    )
    socket.on(
      SocketActionTypes.SUBSCRIBE_FOR_DIRECT_MESSAGE_THREAD,
      async (peerId: string, channelAddress: string) => {
        await ioProxy.subscribeToDirectMessageThread(peerId, channelAddress)
      }
    )
    socket.on(
      SocketActionTypes.SUBSCRIBE_FOR_ALL_CONVERSATIONS,
      async (peerId: string, conversations: string[]) => {
        await ioProxy.subscribeToAllConversations(peerId, conversations)
      }
    )
    socket.on(SocketActionTypes.ASK_FOR_MESSAGES, async (payload: AskForMessagesPayload) => {
      await ioProxy.askForMessages(payload)
    })
    socket.on(
      SocketActionTypes.REGISTER_USER_CERTIFICATE,
      async (payload: RegisterUserCertificatePayload) => {
        log(`Registering user certificate (${payload.id}) on ${payload.serviceAddress}`)
        await ioProxy.registerUserCertificate(payload)
      }
    )
    socket.on(
      SocketActionTypes.REGISTER_OWNER_CERTIFICATE,
      async (payload: RegisterOwnerCertificatePayload) => {
        log(`Registering owner certificate (${payload.id})`)
        await ioProxy.registerOwnerCertificate(payload)
      }
    )
    socket.on(
      SocketActionTypes.SAVE_OWNER_CERTIFICATE,
      async (payload: SaveOwnerCertificatePayload) => {
        log(`Saving owner certificate (${payload.peerId}), community: ${payload.id}`)
        await ioProxy.saveOwnerCertificate(payload)
      }
    )
    socket.on(SocketActionTypes.CREATE_COMMUNITY, async (payload: InitCommunityPayload) => {
      log(`Creating community ${payload.id}`)
      await ioProxy.createCommunity(payload)
    })
    socket.on(
      SocketActionTypes.LAUNCH_COMMUNITY,
      async (payload: InitCommunityPayload) => {
        log(`Launching community ${payload.id} for ${payload.peerId.id}`)
        await ioProxy.launchCommunity(payload)
      }
    )
    socket.on(
      SocketActionTypes.LAUNCH_REGISTRAR,
      async (payload: LaunchRegistrarPayload) => {
        log(`Launching registrar for community ${payload.id}, user ${payload.peerId}`)
        await ioProxy.launchRegistrar(payload)
      }
    )
    socket.on(SocketActionTypes.CREATE_NETWORK, async (communityId: string) => {
      log(`Creating network for community ${communityId}`)
      await ioProxy.createNetwork(communityId)
    })
  })
}
