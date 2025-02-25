import { setupCrypto } from '@quiet/identity'
import { type Store } from '../store.types'
import { type FactoryGirl } from 'factory-girl'
import { getFactory, type publicChannels } from '../..'
import { prepareStore } from '../../utils/tests/prepareStore'
import {
  publicChannels as getPublicChannels,
  currentChannelMessagesMergedBySender,
  sortedCurrentChannelMessages,
  displayableCurrentChannelMessages,
  publicChannelsSelectors,
} from './publicChannels.selectors'
import { publicChannelsActions } from './publicChannels.slice'

import { type identityActions } from '../identity/identity.slice'
import { usersActions } from '../users/users.slice'
import { formatMessageDisplayDate, formatMessageDisplayDay } from '../../utils/functions/dates/formatMessageDisplayDate'
import { displayableMessage } from '../../utils/functions/dates/formatDisplayableMessage'
import { DateTime } from 'luxon'
import { generateChannelId } from '@quiet/common'
import {
  type ChannelMessage,
  type Community,
  type DisplayableMessage,
  type Identity,
  MessageType,
  type PublicChannel,
  User,
} from '@quiet/types'
import { type communitiesActions } from '../communities/communities.slice'

describe('publicChannelsSelectors', () => {
  let store: Store
  let factory: FactoryGirl

  let community: Community
  let alice: Identity
  let john: Identity

  let generalChannel: PublicChannel
  let channelIdes: string[] = []

  const msgs: Record<string, ChannelMessage> = {}
  const msgsOwners: Record<string, string> = {}

  beforeAll(async () => {
    setupCrypto()

    // Set date display format
    process.env.LC_ALL = 'en_US.UTF-8'

    store = prepareStore().store

    factory = await getFactory(store)

    community = await factory.create<ReturnType<typeof communitiesActions.addNewCommunity>['payload']>('Community')

    alice = await factory.create<ReturnType<typeof identityActions.addNewIdentity>['payload']>('Identity', {
      id: community.id,
      nickname: 'alice',
    })

    const generalChannelState = publicChannelsSelectors.generalChannel(store.getState())
    if (generalChannelState) generalChannel = generalChannelState

    expect(generalChannel).not.toBeUndefined()

    channelIdes = [...channelIdes, generalChannel.id]
    john = await factory.create<ReturnType<typeof identityActions.addNewIdentity>['payload']>('Identity', {
      id: community.id,
      nickname: 'john',
    })

    store.dispatch(publicChannelsActions.setCurrentChannel({ channelId: generalChannel.id }))
    // Setup channels
    const channelNames = ['croatia', 'allergies', 'sailing', 'pets', 'antiques']

    for (const name of channelNames) {
      const channel = await factory.create<ReturnType<typeof publicChannels.actions.addChannel>['payload']>(
        'PublicChannel',
        {
          channel: {
            name,
            description: `Welcome to #${name}`,
            timestamp: DateTime.utc().valueOf(),
            owner: alice.nickname,
            id: generateChannelId(name),
          },
        }
      )
      channelIdes = [...channelIdes, channel.channel.id]
    }

    /* Messages ids are being used only for veryfing proper order...
    ...they have no impact on selectors work */
    const messages = [
      {
        id: '1',
        createdAt: DateTime.fromObject({
          year: 2020,
          month: 10,
          day: 20,
          hour: 5,
          minute: 50,
        }).toSeconds(),
        identity: alice,
      },
      // Message 2 and 3 have info type, so they are tested for not being grouped together.
      {
        id: '2',
        type: 3,
        createdAt: DateTime.fromObject({
          year: 2020,
          month: 10,
          day: 20,
          hour: 6,
          minute: 10,
        }).toSeconds(),
        identity: alice,
      },
      {
        id: '3',
        type: 3,
        createdAt: DateTime.fromObject({
          year: 2020,
          month: 10,
          day: 20,
          hour: 6,
          minute: 11,
          second: 30,
          millisecond: 1,
        }).toSeconds(),
        identity: alice,
      },
      {
        id: '4',
        createdAt: DateTime.fromObject({
          year: 2020,
          month: 10,
          day: 20,
          hour: 6,
          minute: 11,
          second: 30,
          millisecond: 2,
        }).toSeconds(),
        identity: alice,
      },
      {
        id: '5',
        createdAt: DateTime.fromObject({
          year: 2020,
          month: 10,
          day: 20,
          hour: 6,
          minute: 12,
          second: 1,
        }).toSeconds(),
        identity: john,
      },
      {
        id: '6',
        createdAt: DateTime.fromObject({
          year: 2020,
          month: 10,
          day: 20,
          hour: 6,
          minute: 12,
          second: 2,
        }).toSeconds(),
        identity: alice,
      },
      {
        id: '7',
        createdAt: DateTime.fromObject({
          year: 2021,
          month: 2,
          day: 5,
          hour: 18,
          minute: 2,
        }).toSeconds(),
        identity: alice,
      },
      {
        id: '8',
        createdAt: DateTime.fromObject({
          year: 2021,
          month: 2,
          day: 5,
          hour: 20,
          minute: 50,
        }).toSeconds(),
        identity: alice,
      },
      {
        id: '9',
        createdAt: DateTime.fromObject({
          year: DateTime.now().toUTC().year,
          month: DateTime.now().toUTC().month,
          day: DateTime.now().toUTC().day,
          hour: 20,
          minute: 50,
        }).toSeconds(),
        identity: alice,
      },
    ]

    // Shuffle messages array
    const shuffled = messages
      .map(value => ({ value, sort: Math.random() }))
      .sort((a, b) => a.sort - b.sort)
      .map(({ value }) => value)

    for (const item of shuffled) {
      const message = await factory.create<ReturnType<typeof publicChannelsActions.test_message>['payload']>(
        'Message',
        {
          identity: item.identity,
          message: {
            id: item.id,
            type: item.type || MessageType.Basic,
            message: `message_${item.id}`,
            createdAt: item.createdAt,
            channelId: generalChannel.id,
            signature: '',
            pubKey: '',
          },
          verifyAutomatically: true,
        }
      )
      msgs[item.id] = message.message
      msgsOwners[item.id] = item.identity.nickname
    }
  })

  it('get messages sorted by date', async () => {
    const messages = sortedCurrentChannelMessages(store.getState())

    const formattedMessages = messages.reduce((prev: ChannelMessage[], curr: ChannelMessage) => {
      return [
        ...prev,
        {
          ...curr,
          channelId: 'general_ec4bca1fa76046c53dff1e49979c3647',
        },
      ]
    }, [])

    formattedMessages.forEach(message => {
      expect(message).toMatchSnapshot({
        createdAt: expect.any(Number),
        pubKey: expect.any(String),
        signature: expect.any(String),
      })
    })
  })

  it('get grouped messages', async () => {
    const messages = currentChannelMessagesMergedBySender(store.getState())
    // Convert regular messages to displayable messages
    const displayable: Record<string, DisplayableMessage> = {}
    for (const message of Object.values(msgs)) {
      const user: User = {
        isDuplicated: false,
        isRegistered: true,
        onionAddress: '',
        peerId: '',
        pubKey: msgs[message.id].pubKey,
        username: msgsOwners[message.id],
      }
      displayable[message.id] = displayableMessage(message, user)
    }

    // Get groups names
    const groupDay1 = formatMessageDisplayDay(formatMessageDisplayDate(msgs['7'].createdAt))
    expect(groupDay1).toBe('Feb 5')
    const groupDay2 = formatMessageDisplayDay(formatMessageDisplayDate(msgs['1'].createdAt))
    expect(groupDay2).toBe('Oct 20')
    const groupDay3 = formatMessageDisplayDay(formatMessageDisplayDate(msgs['9'].createdAt))
    expect(groupDay3).toBe('Today')

    const expectedGrouppedMessages = {
      [groupDay1]: [[displayable['7']], [displayable['8']]],
      [groupDay2]: [
        [displayable['1']],
        [displayable['2']],
        [displayable['3']],
        [displayable['4']],
        [displayable['5']],
        [displayable['6']],
      ],
      [groupDay3]: [[displayable['9']]],
    }
    expect(messages).toStrictEqual(expectedGrouppedMessages)
  })

  it('get channel list in a consistent order', async () => {
    const channels = getPublicChannels(store.getState()).map(channel => channel.name)

    expect(channels).toStrictEqual(['general', 'allergies', 'antiques', 'croatia', 'pets', 'sailing'])
  })

  it("don't select messages without author", async () => {
    const channelId = generateChannelId('utah')
    const channel = (
      await factory.create<ReturnType<typeof publicChannels.actions.addChannel>['payload']>('PublicChannel', {
        channel: {
          name: 'utah',
          description: 'Welcome to #utah',
          timestamp: DateTime.utc().valueOf(),
          owner: alice.nickname,
          id: channelId,
        },
      })
    ).channel

    const elouise = await factory.create<ReturnType<typeof identityActions.addNewIdentity>['payload']>('Identity', {
      id: community.id,
      nickname: 'elouise',
    })

    if (!elouise.userCertificate) throw new Error('no elouise.userCertificate')
    store.dispatch(usersActions.test_remove_user_certificate({ certificate: elouise.userCertificate }))
    // @ts-expect-error - This is statically mocked data so it'll never be undefined
    store.dispatch(usersActions.test_remove_user_csr({ csr: elouise.userCsr?.userCsr }))

    store.dispatch(
      publicChannelsActions.setCurrentChannel({
        channelId: channel.id,
      })
    )

    await factory.create<ReturnType<typeof publicChannelsActions.test_message>['payload']>('Message', {
      identity: elouise,
      message: {
        id: '0',
        type: MessageType.Basic,
        message: 'elouise_message',
        createdAt: DateTime.now().valueOf(),
        channelId: channel.id,
        signature: '',
        pubKey: '',
      },
      verifyAutomatically: true,
    })

    const messages = displayableCurrentChannelMessages(store.getState())

    expect(messages.length).toBe(0)
  })

  it('unreadChannels return empty object if PublicChannels is in the wrong state (no channelStatus)', async () => {
    // This case occurred in a built app
    const store = prepareStore().store
    const factory = await getFactory(store)
    await factory.create<ReturnType<typeof communitiesActions.addNewCommunity>['payload']>('Community')

    const oldState = store.getState()
    const channelId = oldState.PublicChannels.channels.ids[0]
    const newState = {
      ...oldState,
      PublicChannels: {
        ...oldState.PublicChannels,
        channels: {
          ids: oldState.PublicChannels.channels.ids,
          entities: {
            [channelId]: {
              ...oldState.PublicChannels.channels.entities[channelId],
              channelsStatus: undefined,
            },
          },
        },
      },
    }
    // @ts-expect-error
    const unreadChannels = publicChannelsSelectors.unreadChannels(newState)
    expect(unreadChannels).toEqual([])
  })

  it('unreadChannels selector returns only unread channels', async () => {
    const channelId = channelIdes.find(channelId => channelId.includes('allergies'))
    if (!channelId) throw new Error('no channel id')
    store.dispatch(
      publicChannelsActions.markUnreadChannel({
        channelId,
      })
    )
    const unreadChannels = publicChannelsSelectors.unreadChannels(store.getState())
    expect(unreadChannels).toEqual([channelId])
  })
})

export {}
