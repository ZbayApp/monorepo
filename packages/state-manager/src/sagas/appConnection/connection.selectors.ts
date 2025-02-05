import { StoreKeys } from '../store.keys'
import { createSelector } from 'reselect'
import { type CreatedSelectors, type StoreState } from '../store.types'
import { allUsers, areCertificatesLoaded } from '../users/users.selectors'
import { peersStatsAdapter } from './connection.adapter'
import { connectedPeers, isCurrentCommunityInitialized } from '../network/network.selectors'
import { type NetworkStats } from './connection.types'
import { type User } from '../users/users.types'
import { composeInvitationShareUrl, filterAndSortPeers, p2pAddressesToPairs } from '@quiet/common'
import { areMessagesLoaded, areChannelsLoaded } from '../publicChannels/publicChannels.selectors'
import { identitySelectors } from '../identity/identity.selectors'
import { communitiesSelectors } from '../communities/communities.selectors'
import { createLogger } from '../../utils/logger'
import { InvitationData, InvitationDataVersion } from '@quiet/types'

const logger = createLogger('connectionSelectors')

const connectionSlice: CreatedSelectors[StoreKeys.Connection] = (state: StoreState) => state[StoreKeys.Connection]

export const lastConnectedTime = createSelector(connectionSlice, reducerState => reducerState.lastConnectedTime)

export const torBootstrapProcess = createSelector(connectionSlice, reducerState => reducerState.torBootstrapProcess)

export const isTorInitialized = createSelector(connectionSlice, reducerState => reducerState.isTorInitialized)

export const connectionProcess = createSelector(connectionSlice, reducerState => reducerState.connectionProcess)

export const socketIOSecret = createSelector(connectionSlice, reducerState => reducerState.socketIOSecret)

const peerStats = createSelector(connectionSlice, reducerState => {
  let stats: NetworkStats[]
  if (reducerState.peersStats === undefined) {
    stats = []
  } else {
    stats = peersStatsAdapter.getSelectors().selectAll(reducerState.peersStats)
  }
  return stats
})

export const peerList = createSelector(
  communitiesSelectors.currentCommunity,
  identitySelectors.currentPeerAddress,
  peerStats,
  (community, localPeerAddress, stats) => {
    if (!community) return []

    const arr = [...(community.peerList || [])]
    return filterAndSortPeers(arr, stats, localPeerAddress)
  }
)

export const longLivedInvite = createSelector(connectionSlice, reducerState => {
  return reducerState.longLivedInvite
})

export const invitationUrl = createSelector(
  communitiesSelectors.psk,
  communitiesSelectors.ownerOrbitDbIdentity,
  communitiesSelectors.currentCommunity,
  peerList,
  longLivedInvite,
  (communityPsk, ownerOrbitDbIdentity, currentCommunity, sortedPeerList, longLivedInvite) => {
    if (!sortedPeerList || sortedPeerList?.length === 0) return ''
    if (!communityPsk) return ''
    if (!ownerOrbitDbIdentity) return ''
    if (!longLivedInvite) return ''
    if (!currentCommunity) return ''
    if (!currentCommunity.name) return ''
    const initialPeers = sortedPeerList.slice(0, 3)
    const pairs = p2pAddressesToPairs(initialPeers)
    let inviteData: InvitationData = {
      pairs,
      psk: communityPsk,
      ownerOrbitDbIdentity,
      version: InvitationDataVersion.v1,
    }
    if (currentCommunity != null && currentCommunity.name != null && longLivedInvite != null) {
      inviteData = {
        ...inviteData,
        version: InvitationDataVersion.v2,
        authData: {
          communityName: currentCommunity.name,
          seed: longLivedInvite.seed,
        },
      }
      logger.info('Added V2 invite data to the invite link')
    } else {
      logger.warn(
        `Community and/or LFA invite data is missing, can't create V2 invite link! \nCommunity non-null? ${currentCommunity != null} \nCommunity name non-null? ${currentCommunity?.name != null} \nLFA invite data non-null? ${longLivedInvite != null}`
      )
    }
    return composeInvitationShareUrl(inviteData)
  }
)

export const connectedPeersMapping = createSelector(allUsers, connectedPeers, (certificates, peers) => {
  const usersData = Object.values(certificates)
  return peers.reduce((peersMapping: Record<string, User>, peerId: string) => {
    for (const user of usersData) {
      if (peerId === user.peerId) {
        return {
          ...peersMapping,
          [peerId]: user,
        }
      }
    }
    return peersMapping
  }, {})
})

export const isJoiningCompleted = createSelector(
  isCurrentCommunityInitialized,
  areMessagesLoaded,
  areChannelsLoaded,
  areCertificatesLoaded,
  (isCommunity, areMessages, areChannels, areCertificates) => {
    logger.info({ isCommunity, areMessages, areChannels, areCertificates })
    return isCommunity && areMessages && areChannels && areCertificates
  }
)

export const connectionSelectors = {
  lastConnectedTime,
  connectedPeersMapping,
  peerList,
  invitationUrl,
  longLivedInvite,
  torBootstrapProcess,
  connectionProcess,
  isTorInitialized,
  socketIOSecret,
  isJoiningCompleted,
}
