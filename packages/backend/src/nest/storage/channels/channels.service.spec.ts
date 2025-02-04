import { jest } from '@jest/globals'

import { Test, TestingModule } from '@nestjs/testing'
import { keyFromCertificate, parseCertificate } from '@quiet/identity'
import {
  prepareStore,
  getFactory,
  publicChannels,
  generateMessageFactoryContentWithId,
  Store,
} from '@quiet/state-manager'
import {
  ChannelMessage,
  Community,
  FileMetadata,
  Identity,
  MessageType,
  PublicChannel,
  TestMessage,
} from '@quiet/types'

import path from 'path'
import { type PeerId } from '@libp2p/interface'
import waitForExpect from 'wait-for-expect'
import { TestModule } from '../../common/test.module'
import { createArbitraryFile, libp2pInstanceParams } from '../../common/utils'
import { IpfsModule } from '../../ipfs/ipfs.module'
import { IpfsService } from '../../ipfs/ipfs.service'
import { Libp2pModule } from '../../libp2p/libp2p.module'
import { Libp2pService } from '../../libp2p/libp2p.service'
import { SocketModule } from '../../socket/socket.module'
import { StorageModule } from '../storage.module'
import { StorageService } from '../storage.service'
import fs from 'fs'
import { type FactoryGirl } from 'factory-girl'
import { fileURLToPath } from 'url'
import { LocalDbModule } from '../../local-db/local-db.module'
import { LocalDbService } from '../../local-db/local-db.service'
import { createLogger } from '../../common/logger'
import { ChannelsService } from './channels.service'

const logger = createLogger('channelsService:test')

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

describe('ChannelsService', () => {
  let module: TestingModule
  let storageService: StorageService
  let ipfsService: IpfsService
  let libp2pService: Libp2pService
  let localDbService: LocalDbService
  let channelsService: ChannelsService
  let peerId: PeerId

  let store: Store
  let factory: FactoryGirl
  let community: Community
  let channel: PublicChannel
  let alice: Identity
  let john: Identity
  let message: ChannelMessage
  let channelio: PublicChannel
  let filePath: string

  jest.setTimeout(50000)

  beforeAll(async () => {
    store = prepareStore().store
    factory = await getFactory(store)

    community = await factory.create<Community>('Community')

    channel = publicChannels.selectors.publicChannels(store.getState())[0]

    channelio = {
      name: channel.name,
      description: channel.description,
      owner: channel.owner,
      timestamp: channel.timestamp,
      id: channel.id,
    }

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
    filePath = path.join(dirname, '/500kB-file.txt')

    module = await Test.createTestingModule({
      imports: [TestModule, StorageModule, IpfsModule, SocketModule, Libp2pModule, LocalDbModule],
    }).compile()

    storageService = await module.resolve(StorageService)
    channelsService = await module.resolve(ChannelsService)
    localDbService = await module.resolve(LocalDbService)
    libp2pService = await module.resolve(Libp2pService)
    ipfsService = await module.resolve(IpfsService)

    const params = await libp2pInstanceParams()
    peerId = params.peerId.peerId

    await libp2pService.createInstance(params)
    expect(libp2pService.libp2pInstance).not.toBeNull()

    await localDbService.open()
    expect(localDbService.getStatus()).toEqual('open')

    await localDbService.setCommunity(community)
    await localDbService.setCurrentCommunityId(community.id)

    await storageService.init(peerId)
  })

  afterEach(async () => {
    await libp2pService.libp2pInstance?.stop()
    await ipfsService.ipfsInstance?.stop()
    await storageService.stop()
    if (fs.existsSync(filePath)) {
      fs.rmSync(filePath)
    }
    await module.close()
  })

  describe('Channels', () => {
    it('deletes channel as owner', async () => {
      await channelsService.subscribeToChannel(channelio)

      const result = await channelsService.deleteChannel({ channelId: channelio.id, ownerPeerId: peerId.toString() })
      expect(result).toEqual({ channelId: channelio.id })

      const channelFromKeyValueStore = (await channelsService.getChannels()).filter(x => x.id === channelio.id)
      expect(channelFromKeyValueStore).toEqual([])
    })

    it('delete channel as standard user', async () => {
      await channelsService.subscribeToChannel(channelio)

      const result = await channelsService.deleteChannel({ channelId: channelio.id, ownerPeerId: 'random peer id' })
      expect(result).toEqual({ channelId: channelio.id })

      const channelFromKeyValueStore = (await channelsService.getChannels()).filter(x => x.id === channelio.id)
      expect(channelFromKeyValueStore).toEqual([channelio])
    })
  })

  describe('Message access controller', () => {
    it('is saved to db if passed signature verification', async () => {
      await channelsService.subscribeToChannel(channelio)

      const publicChannelRepo = channelsService.publicChannelsRepos.get(message.channelId)
      expect(publicChannelRepo).not.toBeUndefined()
      const store = publicChannelRepo!.store
      const eventSpy = jest.spyOn(store, 'addEntry')

      const messageCopy = {
        ...message,
      }
      delete messageCopy.media

      await channelsService.sendMessage(messageCopy)

      // Confirm message has passed orbitdb validator (check signature verification only)
      expect(eventSpy).toHaveBeenCalled()
      const savedMessages = await channelsService.getMessages(channelio.id)
      expect(savedMessages?.messages.length).toBe(1)
      expect(savedMessages?.messages[0]).toEqual({ ...messageCopy, verified: true })
    })

    it('is not saved to db if did not pass signature verification', async () => {
      const aliceMessage = await factory.create<ReturnType<typeof publicChannels.actions.test_message>['payload']>(
        'Message',
        {
          identity: alice,
          message: generateMessageFactoryContentWithId(channel.id),
        }
      )
      // @ts-expect-error userCertificate can be undefined
      const johnCertificate: string = john.userCertificate
      const johnPublicKey = keyFromCertificate(parseCertificate(johnCertificate))

      const spoofedMessage = {
        ...aliceMessage.message,
        channelId: channelio.id,
        pubKey: johnPublicKey,
      }
      delete spoofedMessage.media // Media 'undefined' is not accepted by db.add

      await channelsService.subscribeToChannel(channelio)

      const publicChannelRepo = channelsService.publicChannelsRepos.get(message.channelId)
      expect(publicChannelRepo).not.toBeUndefined()
      const store = publicChannelRepo!.store
      const eventSpy = jest.spyOn(store, 'addEntry')

      await channelsService.sendMessage(spoofedMessage)

      // Confirm message has passed orbitdb validator (check signature verification only)
      expect(eventSpy).toHaveBeenCalled()
      expect((await channelsService.getMessages(channelio.id))?.messages.length).toBe(0)
    })
  })

  describe('Files deletion', () => {
    let realFilePath: string
    let messages: {
      messages: Record<string, ChannelMessage>
    }

    beforeEach(async () => {
      realFilePath = path.join(dirname, '/real-file.txt')
      await createArbitraryFile(realFilePath, 2147483)

      const metadata: FileMetadata = {
        path: realFilePath,
        name: 'test-large-file',
        ext: '.txt',
        cid: 'uploading_id',
        message: {
          id: 'id',
          channelId: channel.id,
        },
      }

      const aliceMessage = await factory.create<ReturnType<typeof publicChannels.actions.test_message>['payload']>(
        'Message',
        {
          identity: alice,
          message: generateMessageFactoryContentWithId(channel.id, MessageType.File, metadata),
        }
      )

      messages = {
        messages: {
          [aliceMessage.message.id]: aliceMessage.message,
        },
      }
    })

    afterEach(() => {
      if (fs.existsSync(realFilePath)) {
        fs.rmSync(realFilePath)
      }
    })

    it('delete file correctly', async () => {
      console.warn(fs.existsSync(realFilePath))
      const isFileExist = await channelsService.checkIfFileExist(realFilePath)
      expect(isFileExist).toBeTruthy()

      await expect(channelsService.deleteFilesFromChannel(messages)).resolves.not.toThrowError()

      await waitForExpect(async () => {
        expect(await channelsService.checkIfFileExist(realFilePath)).toBeFalsy()
      }, 2000)
    })

    it('file dont exist - not throw error', async () => {
      fs.rmSync(realFilePath)

      await waitForExpect(async () => {
        expect(await channelsService.checkIfFileExist(realFilePath)).toBeFalsy()
      }, 2000)

      await expect(channelsService.deleteFilesFromChannel(messages)).resolves.not.toThrowError()
    })
  })
})
