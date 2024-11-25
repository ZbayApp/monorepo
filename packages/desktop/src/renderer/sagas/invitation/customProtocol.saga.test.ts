import { communities, getFactory, Store } from '@quiet/state-manager'
import { Community, CommunityOwnership, CreateNetworkPayload, InvitationData, InvitationDataV1 } from '@quiet/types'
import { FactoryGirl } from 'factory-girl'
import { expectSaga } from 'redux-saga-test-plan'
import { customProtocolSaga } from './customProtocol.saga'
import { SocketState } from '../socket/socket.slice'
import { prepareStore } from '../../testUtils/prepareStore'
import { StoreKeys } from '../../store/store.keys'
import { modalsActions } from '../modals/modals.slice'
import { ModalName } from '../modals/modals.types'
import { getValidInvitationUrlTestData, validInvitationDatav1, validInvitationDatav2 } from '@quiet/common'
import {
  AlreadyBelongToCommunityWarning,
  InvalidInvitationLinkError,
  JoiningAnotherCommunityWarning,
} from '@quiet/common'

describe('Handle invitation code', () => {
  let store: Store
  let factory: FactoryGirl
  let community: Community
  let validInvitationData: InvitationDataV1
  let validInvitationDeepUrl: string

  beforeEach(async () => {
    store = (
      await prepareStore({
        [StoreKeys.Socket]: {
          ...new SocketState(),
          isConnected: true,
        },
      })
    ).store

    factory = await getFactory(store)

    validInvitationData = getValidInvitationUrlTestData(validInvitationDatav1[0]).data
    validInvitationDeepUrl = getValidInvitationUrlTestData(validInvitationDatav1[0]).deepUrl()
  })

  it('joins network if code is valid', async () => {
    const createNetworkPayload: CreateNetworkPayload = {
      ownership: CommunityOwnership.User,
      inviteData: validInvitationData,
    }
    await expectSaga(customProtocolSaga, communities.actions.customProtocol([validInvitationDeepUrl]))
      .withState(store.getState())
      .put(communities.actions.createNetwork(createNetworkPayload))
      .run()
  })

  // TODO: https://github.com/TryQuiet/quiet/issues/2628
  // it('joins network if v2 code is valid', async () => {
  //   const validInvitationData = getValidInvitationUrlTestData(validInvitationDatav2[0]).data
  //   const validInvitationDeepUrl = getValidInvitationUrlTestData(validInvitationDatav2[0]).deepUrl()
  //   const createNetworkPayload: CreateNetworkPayload = {
  //     ownership: CommunityOwnership.User,
  //     inviteData: validInvitationData,
  //   }
  //   await expectSaga(customProtocolSaga, communities.actions.customProtocol([validInvitationDeepUrl]))
  //     .withState(store.getState())
  //     .put(communities.actions.createNetwork(createNetworkPayload))
  //     .run()
  // })

  it('does not try to create network if user is already in community', async () => {
    community = await factory.create<ReturnType<typeof communities.actions.addNewCommunity>['payload']>('Community')
    const createNetworkPayload: CreateNetworkPayload = {
      ownership: CommunityOwnership.User,
      inviteData: validInvitationData,
    }

    await expectSaga(customProtocolSaga, communities.actions.customProtocol([validInvitationDeepUrl]))
      .withState(store.getState())
      .put(
        modalsActions.openModal({
          name: ModalName.warningModal,
          args: {
            title: AlreadyBelongToCommunityWarning.TITLE,
            subtitle: AlreadyBelongToCommunityWarning.MESSAGE,
          },
        })
      )
      .not.put(communities.actions.createNetwork(createNetworkPayload))
      .run()
  })

  // TODO: https://github.com/TryQuiet/quiet/issues/2628
  // it('does not try to create network if user used v2 invitation link and is joining another community', async () => {
  //   const invitationData = validInvitationDatav2[0]
  //   community = await factory.create<ReturnType<typeof communities.actions.addNewCommunity>['payload']>('Community', {
  //     name: '',
  //     inviteData: invitationData,
  //   })
  //   const newInvitationData = {
  //     ...invitationData,
  //     serverAddress: 'http://something-else.pl',
  //   }
  //   const createNetworkPayload: CreateNetworkPayload = {
  //     ownership: CommunityOwnership.User,
  //     inviteData: newInvitationData,
  //   }

  //   store.dispatch(communities.actions.addNewCommunity(community))
  //   store.dispatch(communities.actions.setCurrentCommunity(community.id))

  //   await expectSaga(
  //     customProtocolSaga,
  //     communities.actions.customProtocol([getValidInvitationUrlTestData(newInvitationData).deepUrl()])
  //   )
  //     .withState(store.getState())
  //     .put(
  //       modalsActions.openModal({
  //         name: ModalName.warningModal,
  //         args: {
  //           title: JoiningAnotherCommunityWarning.TITLE,
  //           subtitle: JoiningAnotherCommunityWarning.MESSAGE,
  //         },
  //       })
  //     )
  //     .not.put(communities.actions.createNetwork(createNetworkPayload))
  //     .run()
  // })

  it('does not try to create network if code is missing data', async () => {
    const createNetworkPayload: CreateNetworkPayload = {
      ownership: CommunityOwnership.User,
      inviteData: validInvitationData,
    }

    await expectSaga(
      customProtocolSaga,
      communities.actions.customProtocol(['someArg', 'quiet://?k=BNlxfE2WBF7LrlpIX0CvECN5o1oZtA16PkAb7GYiwYw='])
    )
      .withState(store.getState())
      .put(
        modalsActions.openModal({
          name: ModalName.warningModal,
          args: {
            title: InvalidInvitationLinkError.TITLE,
            subtitle: InvalidInvitationLinkError.MESSAGE,
          },
        })
      )
      .not.put(communities.actions.createNetwork(createNetworkPayload))
      .run()
  })

  test("doesn't display error if user is connecting with the same community", async () => {
    community = await factory.create<ReturnType<typeof communities.actions.addNewCommunity>['payload']>('Community', {
      name: '',
      psk: validInvitationData.psk,
    })

    const createNetworkPayload: CreateNetworkPayload = {
      ownership: CommunityOwnership.User,
      inviteData: validInvitationData,
    }

    store.dispatch(communities.actions.addNewCommunity(community))
    store.dispatch(communities.actions.setCurrentCommunity(community.id))

    await expectSaga(customProtocolSaga, communities.actions.customProtocol([validInvitationDeepUrl]))
      .withState(store.getState())
      .not.put.like({
        action: {
          type: modalsActions.openModal.type,
          payload: {
            name: ModalName.warningModal,
            params: {
              title: AlreadyBelongToCommunityWarning.TITLE,
              message: AlreadyBelongToCommunityWarning.MESSAGE,
            },
          },
        },
      })
      .put(communities.actions.createNetwork(createNetworkPayload))
      .run()
  })
})
