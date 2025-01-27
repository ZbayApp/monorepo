import { filterAndSortPeers } from './sortPeers'

describe('filterValidAddresses', () => {
  it('filters out invalid addresses', () => {
    const localAddress =
      '/dns4/f3lupwnhaqplbn4djaut5rtipwmlotlb57flfvjzgexek2yezlpjddid.onion/tcp/443/ws/p2p/12D3KooWSYQf8zzr5rYnUdLxYyLzHruQHPaMssja1ADifGAcN3qY'
    const valid = [
      '/dns4/gloao6h5plwjy4tdlze24zzgcxll6upq2ex2fmu2ohhyu4gtys4nrjad.onion/tcp/443/ws/p2p/12D3KooWSYQf8zzr5rYnUdLxYyLzHruQHPaMssja1ADifGAcN4zF',
      '/dns4/gloao6h5plwjy4tdlze24zzgcxll6upq2ex2fmu2ohhyu4gtys4nrjad.onion/tcp/80/ws/p2p/12D3KooWSYQf8zzr5rYnUdLxYyLzHruQHPaMssja1ADifGAcN4zF',
    ]
    const addresses = [
      '/dns4/gloao6h5plwjy4tdlze24zzgcxll6upq2ex2fmu2ohhyu4gtys4nrjad.onion/tcp/443/wss/p2p/12D3KooWSYQf8zzr5rYnUdLxYyLzHruQHPaMssja1ADifGAcN4zF',
      ...valid,
      'invalidAddress',
      '/dns4/somethingElse.onion/tcp/443/wss/p2p/QmZoiJNAvCffeEHBjk766nLuKVdkxkAT7wfFJDPPLsbKSA',
      '/dns4/gloao6h5plwjy4tdlze24zzgcxll6upq2ex2fmu2ohhyu4gtys4nrjad.onion/tcp/443/ws/p2p/QmZoiJNAvCffeEHBjk766nLuKVdkxkAT7wfFJDPPLsbK',
      '/dns4/gloao6h5plwjy4tdlze24zzgcxll6upq2ex2fmu2ohhyu4gtys4nrj.onion/tcp/443/ws/p2p/12D3KooWSYQf8zzr5rYnUdLxYyLzHruQHPaMssja1ADifGAcN4zF',
      'QmZoiJNAvCffeEHBjk766nLuKVdkxkAT7wfFJDPPLsbK',
    ]
    expect(filterAndSortPeers(addresses, [], localAddress)).toEqual([localAddress, ...valid])
  })

  it('sets local address as first without duplicating it', () => {
    const localAddress =
      '/dns4/gloao6h5plwjy4tdlze24zzgcxll6upq2ex2fmu2ohhyu4gtys4nrjad.onion/tcp/80/ws/p2p/12D3KooWSYQf8zzr5rYnUdLxYyLzHruQHPaMssja1ADifGAcN4zF'
    const addresses = [
      localAddress,
      '/dns4/gloao6h5plwjy4tdlze24zzgcxll6upq2ex2fmu2ohhyu4gtys4nrjad.onion/tcp/443/ws/p2p/12D3KooWSYQf8zzr5rYnUdLxYyLzHruQHPaMssja1ADifGAcN3qY',
    ]
    expect(filterAndSortPeers(addresses, [], localAddress)).toEqual([localAddress, addresses[1]])
  })
})
