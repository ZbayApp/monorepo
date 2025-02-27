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

  describe('onSend', () => {
    it('encrypts message correctly', async () => {
      const encryptedMessage = await messagesService.onSend(message)
      expect(encryptedMessage).toEqual(
        expect.objectContaining({
          id: message.id,
          createdAt: message.createdAt,
          channelId: message.channelId,
          contents: expect.objectContaining({
            contents: expect.any(Uint8Array),
            scope: {
              generation: 0,
              type: EncryptionScopeType.ROLE,
              name: RoleName.MEMBER,
            },
          }),
          encSignature: expect.objectContaining({
            author: expect.objectContaining({
              generation: 0,
              type: EncryptionScopeType.USER,
              name: sigChainService.getActiveChain().localUserContext.user.userId,
            }),
            signature: expect.any(String),
          }),
        })
      )
      expect(isUint8Array(encryptedMessage.contents.contents)).toBeTruthy()
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
