import React from 'react'
import '@testing-library/jest-dom/extend-expect'
import userEvent from '@testing-library/user-event'
import { screen, waitFor } from '@testing-library/dom'
import { act } from 'react-dom/test-utils'
import { take } from 'typed-redux-saga'
import MockedSocket from 'socket.io-mock'
import { ioMock } from '../../../../shared/setupTests'
import { prepareStore } from '../../../testUtils/prepareStore'
import { renderComponent } from '../../../testUtils/renderComponent'

import CreateChannel from './CreateChannel'
import CreateChannelComponent from './CreateChannelComponent'

import { ModalName } from '../../../sagas/modals/modals.types'
import { modalsActions } from '../../../sagas/modals/modals.slice'

import { getFactory, identity, publicChannels } from '@quiet/state-manager'

import { createLogger } from '../../../logger'

const logger = createLogger('createChannel:test')

describe('Add new channel', () => {
  let socket: MockedSocket

  beforeEach(() => {
    socket = new MockedSocket()
    ioMock.mockImplementation(() => socket)
  })

  it('entered channel name is slugified', async () => {
    const user = userEvent.setup()
    const { store, runSaga } = await prepareStore(
      {},
      socket // Fork State-manager's sagas
    )

    const factory = await getFactory(store)

    await factory.create<ReturnType<typeof identity.actions.addNewIdentity>['payload']>('Identity', {
      nickname: 'alice',
    })

    renderComponent(<CreateChannel />, store)

    store.dispatch(modalsActions.openModal({ name: ModalName.createChannel }))

    const input = await screen.findByPlaceholderText('Enter a channel name')
    await user.type(input, 'Some channel NAME  ')

    // FIXME: await user.click(screen.getByText('Create Channel') causes this and few other tests to fail (hangs on taking createChannel action)
    await act(
      async () =>
        await waitFor(() => {
          user.click(screen.getByText('Create Channel')).catch(e => {
            logger.error(e)
          })
        })
    )
    // Modal should close after user submits channel name
    expect(screen.queryByDisplayValue('Create a new public channel')).toBeNull()

    await act(async () => {
      await runSaga(testSubmittedChannelName).toPromise()
    })

    function* testSubmittedChannelName(): Generator {
      const createChannelAction = yield* take(publicChannels.actions.createChannel)
      expect(createChannelAction.payload.channel.name).toEqual('some-channel-name--')
    }
  })

  it('user provides proper name', async () => {
    renderComponent(
      <CreateChannelComponent
        open={true}
        createChannel={() => {}}
        handleClose={() => {}}
        clearErrorsDispatch={() => {}}
      />
    )

    const input = screen.getByPlaceholderText('Enter a channel name')
    const warning = screen.queryByTestId('createChannelNameWarning')

    await userEvent.type(input, 'happy-path')
    expect(warning).toBeNull()
  })

  it.each([
    ['UpperCaseToLowerCase', 'uppercasetolowercase'],
    ['spaces to hyphens', 'spaces-to-hyphens'],
    ['!@#$%^&*()', '----------'],
  ])('user inserting wrong channel name "%s" gets corrected "%s"', async (name: string, corrected: string) => {
    renderComponent(
      <CreateChannelComponent
        open={true}
        createChannel={() => {}}
        handleClose={() => {}}
        clearErrorsDispatch={() => {}}
      />
    )

    const input = screen.getByPlaceholderText('Enter a channel name')

    await userEvent.type(input, name)
    expect(screen.getByTestId('createChannelNameWarning')).toHaveTextContent(
      `Your channel will be created as #${corrected}`
    )
  })
})
