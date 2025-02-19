import factoryGirl from 'factory-girl'

import { CustomReduxAdapter } from './reduxAdapter'

import { Store } from '../../sagas/store.types'

import { createMessageSignatureTestHelper, createPeerIdTestHelper } from './helpers'

import { CertificationRequest, getCrypto } from 'pkijs'
import { stringToArrayBuffer } from 'pvutils'

import { DateTime } from 'luxon'

import { communities, identity, messages, publicChannels, users, errors } from '../..'

import { generateChannelId } from '@quiet/common'

import {
  createRootCertificateTestHelper,
  createUserCertificateTestHelper,
  keyObjectFromString,
  verifySignature,
} from '@quiet/identity'

import { ChannelMessage, FileMetadata, MessageType, SendingStatus } from '@quiet/types'

export const generateMessageFactoryContentWithId = (
  channelId: string,
  type?: MessageType,
  media?: FileMetadata
): ChannelMessage => {
  return {
    id: (Math.random() * 10 ** 18).toString(36),
    type: type || MessageType.Basic,
    message: (Math.random() * 10 ** 18).toString(36),
    createdAt: DateTime.utc().valueOf(),
    channelId,
    signature: '',
    pubKey: '',
    media: media || undefined,
  }
}

export const getFactory = async (store: Store) => {
  // @ts-ignore
  const factory = new factoryGirl.FactoryGirl()

  factory.setAdapter(new CustomReduxAdapter(store))

  const registrarUrl = 'http://ugmx77q2tnm5fliyfxfeen5hsuzjtbsz44tsldui2ju7vl5xj4d447yd.onion'

  factory.define(
    'Community',
    communities.actions.addNewCommunity,
    {
      id: factory.sequence('Community.id', (n: number) => n),
      name: factory.sequence('Community.name', (n: number) => `community_${n}`),
      CA: await createRootCertificateTestHelper(registrarUrl),
      peerList: [],
      ownerCertificate: '',
    },
    {
      afterCreate: async (payload: ReturnType<typeof communities.actions.addNewCommunity>['payload']) => {
        // Set current community if there's no current community set yet
        const currentCommunity = communities.selectors.currentCommunity(store.getState())
        if (!currentCommunity) {
          store.dispatch(communities.actions.setCurrentCommunity(payload.id))
        }
        // Create 'general' channel
        await factory.create('PublicChannel', {
          communityId: payload.id,
          channel: {
            name: 'general',
            description: 'Welcome to channel #general',
            timestamp: DateTime.utc().toSeconds(),
            owner: 'alice',
            id: generateChannelId('general'),
          },
        })
        return payload
      },
    }
  )

  factory.define(
    'Identity',
    identity.actions.addNewIdentity,
    {
      id: factory.assoc('Community', 'id'),
      hiddenService: {
        onionAddress: 'putnxiwutblglde5i2mczpo37h5n4dvoqkqg2mkxzov7riwqu2owiaid.onion',
        privateKey:
          'ED25519-V3:WND1FoFZyY+c1f0uD6FBWgKvSYl4CdKSizSR7djRekW/rqw5fTw+gN80sGk0gl01sL5i25noliw85zF1BUBRDQ==',
      },
      peerId: createPeerIdTestHelper(),
      nickname: factory.sequence('Identity.nickname', (n: number) => `user_${n}`),
      userCsr: undefined,
      userCertificate: undefined,
      // 21.09.2022 - may be useful for testing purposes
      joinTimestamp: 1663747464000,
    },
    {
      afterBuild: async (action: ReturnType<typeof identity.actions.addNewIdentity>) => {
        const createCsr = action.payload.userCsr === undefined
        const requestCertificate = action.payload.userCertificate === undefined

        const community = communities.selectors.selectEntities(store.getState())[action.payload.id]!

        const userCertData = await createUserCertificateTestHelper(
          {
            nickname: action.payload.nickname,
            commonName: action.payload.hiddenService!.onionAddress,
            peerId: action.payload.peerId.id,
          },
          community.CA
        )

        if (createCsr) {
          action.payload.userCsr = userCertData.userCsr

          const csrsObjects = users.selectors.csrs(store.getState())

          // TODO: Converting CertificationRequest to string can be an util method
          const csrsStrings = Object.values(csrsObjects)
            .map(obj => {
              if (!(obj instanceof CertificationRequest)) return
              return Buffer.from(obj.toSchema(true).toBER(false)).toString('base64')
            })
            .filter(Boolean) // Filter out possible `undefined` values

          await factory.create('UserCSR', {
            csrs: csrsStrings.concat([userCertData.userCsr.userCsr]),
          })
        }

        if (requestCertificate && userCertData.userCert?.userCertString) {
          action.payload.userCertificate = userCertData.userCert.userCertString

          // Store user's certificate even if the user won't be stored itself
          // (to be able to display messages sent by this user)
          await factory.create('UserCertificate', {
            certificate: action.payload.userCertificate,
          })

          if (!community.ownerCertificate) {
            store.dispatch(
              communities.actions.updateCommunityData({
                id: community.id,
                ownerCertificate: action.payload.userCertificate,
              })
            )
          }
        }

        return action
      },
    }
  )

  factory.define('UserCSR', users.actions.storeCsrs, {
    csrs: [],
  })

  factory.define('UserCertificate', users.actions.storeUserCertificate, {
    certificate: factory.assoc('Identity', 'userCertificate'),
  })

  factory.define('PublicChannelsMessagesBase', messages.actions.addPublicChannelsMessagesBase, {
    channelId: factory.assoc('PublicChannel', 'id'),
  })

  factory.define('PublicChannelSubscription', publicChannels.actions.setChannelSubscribed, {
    channelId: factory.assoc('PublicChannel', 'id'),
  })

  factory.define(
    'PublicChannel',
    publicChannels.actions.addChannel,
    {
      channel: {
        name: factory.sequence('PublicChannel.name', (n: number) => `public-channel-${n}`),
        description: 'Description',
        timestamp: DateTime.utc().toSeconds(),
        owner: factory.assoc('Identity', 'nickname'),
        id: generateChannelId(factory.sequence('PublicChannel.name', (n: number) => `publicChannel${n}`).toString()),
      },
    },
    {
      afterCreate: async (payload: ReturnType<typeof publicChannels.actions.addChannel>['payload']) => {
        await factory.create('PublicChannelsMessagesBase', {
          channelId: payload.channel.id,
        })
        await factory.create('PublicChannelSubscription', {
          channelId: payload.channel.id,
        })
        return payload
      },
    }
  )

  factory.define(
    'Message',
    publicChannels.actions.test_message,
    {
      identity: factory.assoc('Identity'),
      message: {
        id: factory.sequence('Message.id', (n: number) => `${n}`),
        type: MessageType.Basic,
        message: factory.sequence('Message.message', (n: number) => `message_${n}`),
        createdAt: DateTime.utc().valueOf(),
        channelId: generateChannelId('general'),
        signature: '',
        pubKey: '',
      },
      verifyAutomatically: false,
    },
    {
      afterBuild: async (action: ReturnType<typeof publicChannels.actions.test_message>) => {
        let signatureGenerated = false

        // Generate signature if not specified
        if (action.payload.message.signature === '') {
          const userCertificate = action.payload.identity.userCertificate || ''
          const userKey = action.payload.identity.userCsr?.userKey || ''
          signatureGenerated = true
          const { signature, pubKey } = await createMessageSignatureTestHelper(
            action.payload.message.message,
            userCertificate,
            userKey
          )
          action.payload.message.signature = signature
          action.payload.message.pubKey = pubKey
        }

        if (action.payload.verifyAutomatically) {
          // Mock verification status (which will always be true as the signature has been generated by the factory)
          if (signatureGenerated) {
            await factory.create('MessageVerificationStatus', {
              message: action.payload.message,
              isVerified: true,
            })
          } else {
            // Verify the signature
            const crypto = getCrypto()
            const cryptoKey = await keyObjectFromString(action.payload.message.pubKey, crypto)
            const signature = stringToArrayBuffer(action.payload.message.signature)
            const isVerified = await verifySignature(signature, action.payload.message.message, cryptoKey)
            await factory.create('MessageVerificationStatus', {
              message: action.payload.message,
              isVerified,
            })
          }
        }
        return action
      },
      afterCreate: async (payload: ReturnType<typeof publicChannels.actions.test_message>['payload']) => {
        store.dispatch(
          messages.actions.addMessages({
            messages: [payload.message],
          })
        )

        return payload
      },
    }
  )

  factory.define('CacheMessages', publicChannels.actions.cacheMessages, {
    messages: [],
    channelId: factory.assoc('PublicChannel', 'id'),
    communityId: factory.assoc('Community', 'id'),
  })

  factory.define('MessageVerificationStatus', messages.actions.test_message_verification_status, {
    message: factory.assoc('Message'),
    isVerified: true,
  })

  factory.define('MessageSendingStatus', messages.actions.addMessagesSendingStatus, {
    id: factory.assoc('Message', 'id'),
    status: SendingStatus.Pending,
  })

  factory.define('Error', errors.actions.addError, {
    type: 'community',
    code: 500,
    message: 'Community error',
    community: factory.assoc('Community', 'id'),
  })

  return factory
}
