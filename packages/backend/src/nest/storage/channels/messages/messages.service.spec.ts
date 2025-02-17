import { jest } from '@jest/globals'

import { Test, TestingModule } from '@nestjs/testing'
import {
  generateMessageFactoryContentWithId,
  getFactory,
  prepareStore,
  publicChannels,
  Store,
} from '@quiet/state-manager'
import { ChannelMessage, Community, Identity, PublicChannel, TestMessage } from '@quiet/types'
import { isBase58 } from 'class-validator'
import { FactoryGirl } from 'factory-girl'
import { isUint8Array } from 'util/types'
import { EncryptionScopeType } from '../../../auth/services/crypto/types'
import { RoleName } from '../../../auth/services/roles/roles'
import { SigChainService } from '../../../auth/sigchain.service'
import { createLogger } from '../../../common/logger'
import { TestModule } from '../../../common/test.module'
import { StorageModule } from '../../storage.module'
import { MessagesService } from './messages.service'
import { EncryptedMessage } from './messages.types'

const logger = createLogger('messagesService:test')

describe('MessagesService', () => {
  let module: TestingModule
  let messagesService: MessagesService
  let sigChainService: SigChainService

  let store: Store
  let factory: FactoryGirl
  let alice: Identity
  let community: Community
  let channel: PublicChannel
  let message: ChannelMessage

  beforeAll(async () => {
    store = prepareStore().store
    factory = await getFactory(store)

    community = await factory.create<Community>('Community')
    channel = publicChannels.selectors.publicChannels(store.getState())[0]
    alice = await factory.create<Identity>('Identity', { id: community.id, nickname: 'alice' })
    message = (
      await factory.create<TestMessage>('Message', {
        identity: alice,
        message: generateMessageFactoryContentWithId(channel.id),
      })
    ).message
  })

  beforeEach(async () => {
    jest.clearAllMocks()

    module = await Test.createTestingModule({
      imports: [TestModule, StorageModule],
    }).compile()

    sigChainService = await module.resolve(SigChainService)
    await sigChainService.createChain(community.name!, alice.nickname, true)
    messagesService = await module.resolve(MessagesService)
  })

  describe('verifyMessage', () => {
    it('message with valid signature is verified', async () => {
      const encryptedMessage = await messagesService.onSend(message)
      expect(messagesService.verifyMessage(encryptedMessage)).toBeTruthy()
    })

    it('message with invalid signature is not verified', async () => {
      const encryptedMessage = await messagesService.onSend(message)
      let err: Error | undefined = undefined
      try {
        messagesService.verifyMessage({
          ...encryptedMessage,
          encSignature: {
            ...encryptedMessage.encSignature,
            author: {
              generation: 1,
              name: 'foobar',
              type: '',
            },
          },
        })
      } catch (e) {
        err = e
      }
      expect(err).toBeDefined()
    })
  })

  describe('onSend', () => {
    it('encrypts message correctly', async () => {
      const encryptedMessage = await messagesService.onSend(message)
      expect(encryptedMessage).toEqual(
        expect.objectContaining({
          ...message,
          message: expect.objectContaining({
            scope: {
              generation: 0,
              type: EncryptionScopeType.ROLE,
              name: RoleName.MEMBER,
            },
          }),
        })
      )
      expect(isUint8Array(encryptedMessage.message.contents)).toBeTruthy()
    })
  })

  describe('onConsume', () => {
    it('decrypts an encrypted message correctly', async () => {
      const encryptedMessage = await messagesService.onSend(message)
      expect(await messagesService.onConsume(encryptedMessage)).toEqual({
        ...message,
        verified: true,
        encSignature: encryptedMessage.encSignature,
      })
    })

    it('returns undefined when the signature is invalid', async () => {
      const encryptedMessage = await messagesService.onSend(message)
      const invalidEncryptedMessage: EncryptedMessage = {
        ...encryptedMessage,
        encSignature: {
          ...encryptedMessage.encSignature,
          author: {
            generation: 1,
            name: 'foobar',
            type: '',
          },
        },
      }

      expect(await messagesService.onConsume(invalidEncryptedMessage)).toBeUndefined()
    })
  })
})
