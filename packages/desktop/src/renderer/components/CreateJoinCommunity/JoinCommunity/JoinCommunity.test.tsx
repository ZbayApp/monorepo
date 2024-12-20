import React from 'react'
import '@testing-library/jest-dom/extend-expect'
import { screen, waitFor } from '@testing-library/dom'
import { act } from 'react-dom/test-utils'
import userEvent from '@testing-library/user-event'
import { renderComponent } from '../../../testUtils/renderComponent'
import { prepareStore } from '../../../testUtils/prepareStore'
import { StoreKeys } from '../../../store/store.keys'
import { SocketState } from '../../../sagas/socket/socket.slice'
import { ModalName } from '../../../sagas/modals/modals.types'
import { ModalsInitialState } from '../../../sagas/modals/modals.slice'
import JoinCommunity from './JoinCommunity'
import CreateCommunity from '../CreateCommunity/CreateCommunity'
import { JoinCommunityDictionary, CreateCommunityDictionary } from '../community.dictionary'
import CreateUsername from '../../CreateUsername/CreateUsername'
import PerformCommunityActionComponent from '../PerformCommunityActionComponent'
import { inviteLinkField } from '../../../forms/fields/communityFields'
import { InviteLinkErrors } from '../../../forms/fieldsErrors'
import { CommunityOwnership } from '@quiet/types'
import {
  Site,
  QUIET_JOIN_PAGE,
  validInvitationCodeTestData,
  getValidInvitationUrlTestData,
  PSK_PARAM_KEY,
  validInvitationDatav1,
} from '@quiet/common'

describe('join community', () => {
  const { code, data } = getValidInvitationUrlTestData(validInvitationDatav1[0])

  const validCode = code()

  it('users switches from join to create', async () => {
    const { store } = await prepareStore({
      [StoreKeys.Socket]: {
        ...new SocketState(),
        isConnected: true,
      },
      [StoreKeys.Modals]: {
        ...new ModalsInitialState(),
        [ModalName.joinCommunityModal]: { open: true },
      },
    })

    renderComponent(
      <>
        <JoinCommunity />
        <CreateCommunity />
      </>,
      store
    )

    // Confirm proper modal title is displayed
    const joinCommunityDictionary = JoinCommunityDictionary()
    const joinCommunityTitle = screen.getByText(joinCommunityDictionary.header)
    expect(joinCommunityTitle).toBeVisible()

    // Click redirecting link
    const link = screen.getByTestId('JoinCommunityLink')
    await userEvent.click(link)

    // Confirm user is being redirected to create community
    const createCommunityDictionary = CreateCommunityDictionary()
    const createCommunityTitle = await screen.findByText(createCommunityDictionary.header)
    expect(createCommunityTitle).toBeVisible()
  })

  it.skip('user goes from joning community to username registration, then comes back', async () => {
    const { store } = await prepareStore({
      [StoreKeys.Socket]: {
        ...new SocketState(),
        isConnected: true,
      },
      [StoreKeys.Modals]: {
        ...new ModalsInitialState(),
        [ModalName.joinCommunityModal]: { open: true },
      },
    })

    renderComponent(
      <>
        <JoinCommunity />
        <CreateUsername />
      </>,
      store
    )

    // Confirm proper modal title is displayed
    const dictionary = JoinCommunityDictionary()
    const joinCommunityTitle = screen.getByText(dictionary.header)
    expect(joinCommunityTitle).toBeVisible()

    // Enter community address and hit button
    const joinCommunityInput = screen.getByPlaceholderText(dictionary.placeholder)
    const joinCommunityButton = screen.getByText(dictionary.button)
    await userEvent.type(joinCommunityInput, '3lyn5yjwwb74he5olv43eej7knt34folvrgrfsw6vzitvkxmc5wpe4yd')
    await userEvent.click(joinCommunityButton)

    // Confirm user is being redirected to username registration
    const createUsernameTitle = await screen.findByText('Register a username')
    expect(createUsernameTitle).toBeVisible()

    // Close username registration modal
    const closeButton = await screen.findByTestId('createUsernameModalActions')
    await userEvent.click(closeButton)
    expect(joinCommunityTitle).toBeVisible()
  })

  it('joins community on submit if connection is ready and registrar url is correct', async () => {
    const handleCommunityAction = jest.fn()

    const component = (
      <PerformCommunityActionComponent
        open={true}
        handleClose={() => {}}
        communityOwnership={CommunityOwnership.User}
        handleCommunityAction={handleCommunityAction}
        handleRedirection={() => {}}
        isConnectionReady={true}
        isCloseDisabled={true}
        hasReceivedResponse={false}
      />
    )

    const result = renderComponent(component)

    const textInput = result.queryByPlaceholderText(inviteLinkField().fieldProps.placeholder)
    expect(textInput).not.toBeNull()
    // @ts-expect-error
    await userEvent.type(textInput, validCode)

    const submitButton = result.getByText('Continue')
    expect(submitButton).toBeEnabled()
    await userEvent.click(submitButton)

    await waitFor(() => expect(handleCommunityAction).toBeCalledWith(data))
  })

  it.each([[`${QUIET_JOIN_PAGE}#${validCode}`], [`${QUIET_JOIN_PAGE}/#${validCode}`]])(
    'joins community on submit if connection is ready and invitation code is a correct invitation url (%s)',
    async (invitationLink: string) => {
      const registrarUrl = new URL(invitationLink)

      const handleCommunityAction = jest.fn()

      const component = (
        <PerformCommunityActionComponent
          open={true}
          handleClose={() => {}}
          communityOwnership={CommunityOwnership.User}
          handleCommunityAction={handleCommunityAction}
          handleRedirection={() => {}}
          isConnectionReady={true}
          isCloseDisabled={true}
          hasReceivedResponse={false}
        />
      )

      const result = renderComponent(component)

      const textInput = result.queryByPlaceholderText(inviteLinkField().fieldProps.placeholder)
      expect(textInput).not.toBeNull()
      // @ts-expect-error
      await userEvent.type(textInput, registrarUrl.href)

      const submitButton = result.getByText('Continue')
      expect(submitButton).toBeEnabled()
      await userEvent.click(submitButton)

      await waitFor(() => expect(handleCommunityAction).toBeCalledWith(data))
    }
  )

  it('trims whitespaces from registrar url', async () => {
    const registrarUrl = validCode + '     '

    const handleCommunityAction = jest.fn()

    const component = (
      <PerformCommunityActionComponent
        open={true}
        handleClose={() => {}}
        communityOwnership={CommunityOwnership.User}
        handleCommunityAction={handleCommunityAction}
        handleRedirection={() => {}}
        isConnectionReady={true}
        isCloseDisabled={true}
        hasReceivedResponse={false}
      />
    )

    const result = renderComponent(component)

    const textInput = result.queryByPlaceholderText(inviteLinkField().fieldProps.placeholder)
    expect(textInput).not.toBeNull()
    // @ts-expect-error
    await userEvent.type(textInput, registrarUrl)

    const submitButton = result.getByText('Continue')
    expect(submitButton).toBeEnabled()
    await userEvent.click(submitButton)

    await waitFor(() => expect(handleCommunityAction).toBeCalledWith(data))
  })

  it.each([
    [`http://${validCode}`, InviteLinkErrors.InvalidCode],
    [
      `12D3KooWKCWstmqi5gaQvipT7xVneVGfWV7HYpCbmUu626R92hXx=bbb&${PSK_PARAM_KEY}=${data.psk}`,
      InviteLinkErrors.InvalidCode,
    ],
    ['bbb=y7yczmugl2tekami7sbdz5pfaemvx7bahwthrdvcbzw5vex2crsr26qd', InviteLinkErrors.InvalidCode],
    ['12D3KooWKCWstmqi5gaQvipT7xVneVGfWV7HYpCbmUu626R92hXx= ', InviteLinkErrors.InvalidCode],
    ['nqnw4kc4c77fb47lk52m5l57h4tc', InviteLinkErrors.InvalidCode],
    [`https://otherwebsite.com/${Site.JOIN_PAGE}#${validCode}`, InviteLinkErrors.InvalidCode],
    [`${QUIET_JOIN_PAGE}?param=nqnw4kc4c77fb47lk52m5l57h4tcxceo7ymxekfn7yh5m66t4jv2olad`, InviteLinkErrors.InvalidCode],
    [`${Site.MAIN_PAGE}/share?${validCode}`, InviteLinkErrors.InvalidCode],
  ])('user inserting invalid url %s should see "%s" error', async (url: string, error: string) => {
    const handleCommunityAction = jest.fn()

    renderComponent(
      <PerformCommunityActionComponent
        open={true}
        handleClose={() => {}}
        communityOwnership={CommunityOwnership.User}
        handleCommunityAction={handleCommunityAction}
        handleRedirection={() => {}}
        isConnectionReady={true}
        isCloseDisabled={true}
        hasReceivedResponse={false}
      />
    )

    const input = screen.getByPlaceholderText('Invite link')
    const button = screen.getByText('Continue')

    await userEvent.type(input, url)
    await userEvent.click(button)

    await waitFor(() => expect(handleCommunityAction).not.toBeCalled())

    const message = await screen.findByText(error)
    expect(message).toBeVisible()
  })

  it('blocks submit button if connection is not ready', async () => {
    const handleCommunityAction = jest.fn()

    const component = (
      <PerformCommunityActionComponent
        open={true}
        handleClose={() => {}}
        communityOwnership={CommunityOwnership.User}
        handleCommunityAction={handleCommunityAction}
        handleRedirection={() => {}}
        isConnectionReady={false}
        isCloseDisabled={true}
        hasReceivedResponse={false}
      />
    )

    const result = renderComponent(component)

    const textInput = result.queryByPlaceholderText(inviteLinkField().fieldProps.placeholder)
    expect(textInput).not.toBeNull()
    // @ts-expect-error
    await userEvent.type(textInput, validCode)

    const submitButton = result.getByTestId('continue-joinCommunity')
    expect(submitButton).not.toBeNull()
    expect(submitButton).toBeDisabled()

    expect(handleCommunityAction).not.toBeCalled()
  })

  it('shows loading spinner on submit button while waiting for the response', async () => {
    const { rerender } = renderComponent(
      <PerformCommunityActionComponent
        open={true}
        handleClose={() => {}}
        communityOwnership={CommunityOwnership.User}
        handleCommunityAction={() => {}}
        handleRedirection={() => {}}
        isConnectionReady={true}
        isCloseDisabled={true}
        hasReceivedResponse={false}
      />
    )

    const textInput = screen.getByPlaceholderText(inviteLinkField().fieldProps.placeholder)
    await userEvent.type(textInput, validCode)

    const submitButton = screen.getByText('Continue')
    expect(submitButton).toBeEnabled()
    await userEvent.click(submitButton)

    await act(async () => {})

    expect(screen.queryByTestId('loading-button-progress')).toBeVisible()

    // Rerender component to verify circular progress has dissapeared
    rerender(
      <PerformCommunityActionComponent
        open={true}
        handleClose={() => {}}
        communityOwnership={CommunityOwnership.User}
        handleCommunityAction={() => {}}
        handleRedirection={() => {}}
        isConnectionReady={true}
        isCloseDisabled={true}
        hasReceivedResponse={true}
      />
    )

    expect(screen.queryByTestId('loading-button-progress')).toBeNull()
  })

  it('handles redirection to create community page if user clicks on the link', async () => {
    const handleRedirection = jest.fn()

    const component = (
      <PerformCommunityActionComponent
        open={true}
        handleClose={() => {}}
        communityOwnership={CommunityOwnership.User}
        handleCommunityAction={() => {}}
        handleRedirection={handleRedirection}
        isConnectionReady={true}
        isCloseDisabled={true}
        hasReceivedResponse={false}
      />
    )

    const result = renderComponent(component)

    const switchLink = result.queryByText('create a new community')
    expect(switchLink).not.toBeNull()
    // @ts-expect-error
    await userEvent.click(switchLink)

    expect(handleRedirection).toBeCalled()
  })
})
