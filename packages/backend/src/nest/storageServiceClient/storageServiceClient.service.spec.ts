import { jest } from '@jest/globals'

import { Test } from '@nestjs/testing'
import { StorageServiceClientModule } from './storageServiceClient.module'
import { StorageServiceClient } from './storageServiceClient.service'
import { ServerStoredCommunityMetadata } from './storageServiceClient.types'
import { prepareResponse } from './testUtils'
import { createLibp2pAddress, getValidInvitationUrlTestData, validInvitationDatav1 } from '@quiet/common'
import { Response } from 'node-fetch'

const mockFetch = async (responseData: Partial<Response>[]) => {
  /** Mock fetch responses and then initialize nest service */
  const mockedFetch = jest.fn(() => {
    return Promise.resolve(prepareResponse(responseData[0]))
  })

  for (const data of responseData) {
    mockedFetch.mockResolvedValueOnce(prepareResponse(data))
  }

  const module = await Test.createTestingModule({
    imports: [StorageServiceClientModule],
  }).compile()
  const service = module.get<StorageServiceClient>(StorageServiceClient)
  service.fetch = mockedFetch
  return service
}

describe('Storage Service Client', () => {
  let clientMetadata: ServerStoredCommunityMetadata
  beforeEach(() => {
    const data = getValidInvitationUrlTestData(validInvitationDatav1[0]).data
    clientMetadata = {
      id: '12345678',
      ownerCertificate: 'MIIDeTCCAyCgAwIBAgIGAYv8J0ToMAoGCCqGSM49BAMCMBIxEDAOBgNVBAMTB21hYzIzMT',
      rootCa: 'MIIBUjCB+KADAgECAgEBMAoGCCqGSM49BAMCMBIxEDAOBgNVBAM',
      ownerOrbitDbIdentity: data.ownerOrbitDbIdentity,
      peerList: [createLibp2pAddress(data.pairs[0].onionAddress, data.pairs[0].peerId)],
      psk: data.psk,
    }
  })

  afterEach(async () => {
    jest.clearAllMocks()
  })

  it('downloads data for existing cid and proper server address', async () => {
    const service = await mockFetch([
      { status: 200, json: () => Promise.resolve({ access_token: 'secretToken' }) },
      { status: 200, json: () => Promise.resolve(clientMetadata) },
    ])
    service.setServerAddress('http://whatever')
    const data = await service.downloadData('cid')
    expect(data).toEqual(clientMetadata)
    expect(service.fetch).toHaveBeenCalledTimes(2)
  })

  it('throws error if downloaded metadata does not have proper schema', async () => {
    const metadataLackingField = {
      id: clientMetadata.id,
      ownerCertificate: clientMetadata.ownerCertificate,
      rootCa: clientMetadata.rootCa,
      ownerOrbitDbIdentity: clientMetadata.ownerOrbitDbIdentity,
      peerList: clientMetadata.peerList,
    }
    const service = await mockFetch([
      { status: 200, json: () => Promise.resolve({ access_token: 'secretToken' }) },
      { status: 200, json: () => Promise.resolve(metadataLackingField) },
    ])
    service.setServerAddress('http://whatever')
    expect(service.downloadData('cid')).rejects.toThrow('Invalid metadata')
  })

  it('obtains token', async () => {
    const expectedToken = 'verySecretToken'
    const service = await mockFetch([{ status: 200, json: () => Promise.resolve({ access_token: expectedToken }) }])
    service.setServerAddress('http://whatever')
    const token = await service.auth()
    expect(token).toEqual(expectedToken)
    expect(service.fetch).toHaveBeenCalledTimes(1)
  })
})
