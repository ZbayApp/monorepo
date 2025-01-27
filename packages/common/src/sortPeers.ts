import { type NetworkStats } from '@quiet/types'
import { filterValidAddresses } from './libp2p'
import { createLogger } from './logger'

const logger = createLogger(`sortPeers`)

/**
This is the very simple algorithm for evaluating the most wanted peers.
0. Filters out invalid peers addresses
1. It takes the peers stats list that contains statistics for every peer our node was ever connected to.
2. Two sorted arrays are created - one sorted by last seen and other by most uptime shared.
3. Arrays are merged taking one element from list one and one element from the second list. Duplicates are ommited
4. We end up with mix of last seen and most uptime descending array of peers, the it is enchanced to libp2p address.
5. Prioritize local peer if given
 */
export const filterAndSortPeers = (
  peersAddresses: string[],
  stats: NetworkStats[],
  localPeerAddress?: string,
  includeLocalPeerAddress: boolean = true
): string[] => {
  peersAddresses = filterValidAddresses(peersAddresses)
  const currentlyConnected = [...stats].filter(peer => peer.connectionTime === 0)
  const lastSeenSorted = [...stats].sort((a, b) => {
    return b.lastSeen - a.lastSeen
  })
  const mostUptimeSharedSorted = [...stats].sort((a, b) => {
    return b.connectionTime - a.connectionTime
  })

  const mostWantedPeers: NetworkStats[] = currentlyConnected

  for (let i = 0; i < stats.length; i++) {
    const peerOne = lastSeenSorted[i]
    const peerTwo = mostUptimeSharedSorted[i]

    if (!mostWantedPeers.includes(peerOne)) {
      mostWantedPeers.push(peerOne)
    }

    if (!mostWantedPeers.includes(peerTwo)) {
      mostWantedPeers.push(peerTwo)
    }
  }

  const peerSet: Set<string> = new Set()
  if (includeLocalPeerAddress && localPeerAddress) {
    peerSet.add(localPeerAddress)
  }

  mostWantedPeers.forEach(peer => {
    const found = peersAddresses.find(peerAddress => {
      const id = peerAddress.split('/')[7]
      if (id === peer.peerId) {
        peersAddresses.splice(peersAddresses.indexOf(peerAddress), 1)
        return true
      }
    })
    if (found && found !== '') {
      peerSet.add(found)
    }
  })
  peersAddresses.forEach(peerAddress => {
    if (!peerSet.has(peerAddress)) {
      peerSet.add(peerAddress)
    }
  })

  return [...peerSet]
}
