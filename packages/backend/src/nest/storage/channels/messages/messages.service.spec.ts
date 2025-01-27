import { jest } from '@jest/globals'

import { Test, TestingModule } from '@nestjs/testing'
import { keyFromCertificate, parseCertificate } from '@quiet/identity'
import {
  generateMessageFactoryContentWithId,
  getFactory,
  prepareStore,
  publicChannels,
  Store,
} from '@quiet/state-manager'
import { ChannelMessage, Community, Identity, PublicChannel, TestMessage } from '@quiet/types'
import { FactoryGirl } from 'factory-girl'
import { SigChainService } from '../../../auth/sigchain.service'
import { createLogger } from '../../../common/logger'
import { TestModule } from '../../../common/test.module'
import { StorageModule } from '../../storage.module'
import { MessagesService } from './messages.service'

const logger = createLogger('messagesService:test')

describe('MessagesService', () => {
  let module: TestingModule
  let messagesService: MessagesService
  let sigChainService: SigChainService

  let store: Store
  let factory: FactoryGirl
  let alice: Identity
  let john: Identity
  let community: Community
  let channel: PublicChannel
  let message: ChannelMessage

  beforeAll(async () => {
    store = prepareStore().store
    factory = await getFactory(store)

    community = await factory.create<Community>('Community')
    channel = publicChannels.selectors.publicChannels(store.getState())[0]
    alice = await factory.create<Identity>('Identity', { id: community.id, nickname: 'alice' })
    john = await factory.create<Identity>('Identity', { id: community.id, nickname: 'john' })
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
    messagesService = await module.resolve(MessagesService)
  })

  describe('verifyMessage', () => {
    it('message with valid signature is verified', async () => {
      expect(await messagesService.verifyMessage(message)).toBeTruthy()
    })

    it('message with invalid signature is not verified', async () => {
      expect(
        await messagesService.verifyMessage({
          ...message,
          pubKey: keyFromCertificate(parseCertificate(john.userCertificate!)),
        })
      ).toBeFalsy()
    })
  })

  // TODO: https://github.com/TryQuiet/quiet/issues/2631
  describe('onSend', () => {
    it('does nothing but return the message as-is', async () => {
      expect(await messagesService.onSend(message)).toEqual(message)
    })
  })

  // TODO: https://github.com/TryQuiet/quiet/issues/2632
  describe('onConsume', () => {
    it('runs verifyMessage when verify === true', async () => {
      expect(await messagesService.onConsume(message, true)).toEqual({
        ...message,
        verified: true,
      })
    })

    it('skips verifyMessage when verify === false', async () => {
      const fakePubKey = keyFromCertificate(parseCertificate(john.userCertificate!))
      expect(
        await messagesService.onConsume(
          {
            ...message,
            pubKey: fakePubKey,
          },
          false
        )
      ).toEqual({
        ...message,
        pubKey: fakePubKey,
        verified: true,
      })
    })
  })
})
