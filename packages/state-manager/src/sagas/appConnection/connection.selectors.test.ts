import { setupCrypto } from '@quiet/identity'
import { type Store } from '@reduxjs/toolkit'
import { getFactory } from '../../utils/tests/factories'
import { prepareStore } from '../../utils/tests/prepareStore'
import { connectionSelectors } from './connection.selectors'
import { communitiesActions } from '../communities/communities.slice'
import { connectionActions } from './connection.slice'
import { type FactoryGirl } from 'factory-girl'
import { type Community } from '@quiet/types'
import { composeInvitationShareUrl, createLibp2pAddress, p2pAddressesToPairs } from '@quiet/common'

describe('communitiesSelectors', () => {
  setupCrypto()

  let store: Store
  let community: Community
  let factory: FactoryGirl

  beforeEach(async () => {
    store = prepareStore({}).store
    factory = await getFactory(store)
  })

  it('select peers sorted by quality', async () => {
    community = await factory.create<ReturnType<typeof communitiesActions.addNewCommunity>['payload']>('Community', {
      peerList: [
        '/dns4/ubapl2lfxci5cc35oegshdsjhlt656xo6vbmztpb2ndb6ftqjjuv5myd.onion/tcp/443/ws/p2p/12D3KooWKCWstmqi5gaQvipT7xVneVGfWV7HYpCbmUu626R92hXx',
        '/dns4/rjdhzqgrl3bzu4v5cwfla3tafjtdeuzeapk34qvf7mvfhc3hih5fmnqd.onion/tcp/443/ws/p2p/12D3KooWHgLdRMqkepNiYnrur21cyASUNk1f9NZ5tuGa9He8QXNa',
        '/dns4/kkzkv2u53aehfjz7mqgnt3mp2hemcr2h74vtmxpxuh4a5yna7kltsiqd.onion/tcp/443/ws/p2p/12D3KooWPYjyHnYYwe3kzEESMVbpAUHkQyEQpRHehH8QYtGRntVn',
        '/dns4/hricycxramxkn4v46b3pllnozfop6fkl7xdfk2htboe3zakhq3ephjid.onion/tcp/443/ws/p2p/12D3KooWSYQf8zzr5rYnUdLxYyLzHruQHPaMssja1ADifGAcN3qY',
        '/dns4/f3lupwnhaqplbn4djaut5rtipwmlotlb57flfvjzgexek2yezlpjddid.onion/tcp/443/ws/p2p/12D3KooWEHzmff5kZAvyU6Diq5uJG8QkWJxFNUcBLuWjxUGvxaqw',
      ],
    })

    // This peer should be first in the list as it is the most recently seen one.
    store.dispatch(
      connectionActions.updateNetworkData({
        peer: '12D3KooWEHzmff5kZAvyU6Diq5uJG8QkWJxFNUcBLuWjxUGvxaqw',
        connectionDuration: 50,
        lastSeen: 1000,
      })
    )

    // This peer should be second as it has the most shared uptime
    store.dispatch(
      connectionActions.updateNetworkData({
        peer: '12D3KooWKCWstmqi5gaQvipT7xVneVGfWV7HYpCbmUu626R92hXx',
        connectionDuration: 500,
        lastSeen: 900,
      })
    )

    // This is actually the third one on the list of last seen peers and it goes next, note that the upper peer which should go before that is already in the list.
    store.dispatch(
      connectionActions.updateNetworkData({
        peer: '12D3KooWHgLdRMqkepNiYnrur21cyASUNk1f9NZ5tuGa9He8QXNa',
        connectionDuration: 200,
        lastSeen: 500,
      })
    )

    // This is the least valuable peer so it goes last. Rmaining peers, without any network data will be concated to the end of the list.
    store.dispatch(
      connectionActions.updateNetworkData({
        peer: '12D3KooWSYQf8zzr5rYnUdLxYyLzHruQHPaMssja1ADifGAcN3qY',
        connectionDuration: 100,
        lastSeen: 100,
      })
    )

    const expectedArray = [
      '/dns4/f3lupwnhaqplbn4djaut5rtipwmlotlb57flfvjzgexek2yezlpjddid.onion/tcp/443/ws/p2p/12D3KooWEHzmff5kZAvyU6Diq5uJG8QkWJxFNUcBLuWjxUGvxaqw',
      '/dns4/ubapl2lfxci5cc35oegshdsjhlt656xo6vbmztpb2ndb6ftqjjuv5myd.onion/tcp/443/ws/p2p/12D3KooWKCWstmqi5gaQvipT7xVneVGfWV7HYpCbmUu626R92hXx',
      '/dns4/rjdhzqgrl3bzu4v5cwfla3tafjtdeuzeapk34qvf7mvfhc3hih5fmnqd.onion/tcp/443/ws/p2p/12D3KooWHgLdRMqkepNiYnrur21cyASUNk1f9NZ5tuGa9He8QXNa',
      '/dns4/hricycxramxkn4v46b3pllnozfop6fkl7xdfk2htboe3zakhq3ephjid.onion/tcp/443/ws/p2p/12D3KooWSYQf8zzr5rYnUdLxYyLzHruQHPaMssja1ADifGAcN3qY',
      '/dns4/kkzkv2u53aehfjz7mqgnt3mp2hemcr2h74vtmxpxuh4a5yna7kltsiqd.onion/tcp/443/ws/p2p/12D3KooWPYjyHnYYwe3kzEESMVbpAUHkQyEQpRHehH8QYtGRntVn',
    ]

    const peersList = connectionSelectors.peerList(store.getState())
    expect(peersList).toMatchObject(expectedArray)
  })

  it('select socketIOSecret', async () => {
    const secret = 'secret'
    const socketIOSecret = connectionSelectors.socketIOSecret(store.getState())

    expect(socketIOSecret).toBeNull()

    store.dispatch(connectionActions.setSocketIOSecret(secret))

    const socketIOSecret2 = connectionSelectors.socketIOSecret(store.getState())

    expect(socketIOSecret2).toEqual(secret)
  })

  it('invitationUrl selector does not break if there is no community', () => {
    const { store } = prepareStore()
    const invitationUrl = connectionSelectors.invitationUrl(store.getState())
    expect(invitationUrl).toEqual('')
  })

  it('invitationUrl selector returns proper url', async () => {
    const { store } = prepareStore()
    const factory = await getFactory(store)
    const peerList = [
      createLibp2pAddress(
        'gloao6h5plwjy4tdlze24zzgcxll6upq2ex2fmu2ohhyu4gtys4nrjad',
        '12D3KooWCXzUw71ovvkDky6XkV57aCWUV9JhJoKhoqXa1gdhFNoL'
      ),
    ]
    const psk = '12345'
    const ownerOrbitDbIdentity = 'testOwnerOrbitDbIdentity'
    await factory.create<ReturnType<typeof communitiesActions.addNewCommunity>['payload']>('Community', {
      peerList,
      psk,
      ownerOrbitDbIdentity,
    })
    const selectorInvitationUrl = connectionSelectors.invitationUrl(store.getState())
    const pairs = p2pAddressesToPairs(peerList)
    const expectedUrl = composeInvitationShareUrl({ pairs, psk, ownerOrbitDbIdentity })
    expect(expectedUrl).not.toEqual('')
    expect(selectorInvitationUrl).toEqual(expectedUrl)
  })

  it('invitationUrl selector returns empty string if state lacks psk', async () => {
    const { store } = prepareStore()
    const factory = await getFactory(store)
    await factory.create<ReturnType<typeof communitiesActions.addNewCommunity>['payload']>('Community', {
      peerList: [
        createLibp2pAddress(
          'gloao6h5plwjy4tdlze24zzgcxll6upq2ex2fmu2ohhyu4gtys4nrjad',
          '12D3KooWCXzUw71ovvkDky6XkV57aCWUV9JhJoKhoqXa1gdhFNoL'
        ),
      ],
    })
    const invitationUrl = connectionSelectors.invitationUrl(store.getState())
    expect(invitationUrl).toEqual('')
  })
})
