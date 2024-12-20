import React from 'react'
import { fireEvent, screen } from '@testing-library/dom'
import { prepareStore, renderComponent } from '../../../testUtils'
import { StoreKeys } from '@quiet/state-manager'
import { ModalsInitialState } from '../../../sagas/modals/modals.slice'
import { ModalName } from '../../../sagas/modals/modals.types'
import * as UpdateModal from './UpdateModal'

describe('Update Modal', () => {
  test('triggers app update on button click', async () => {
    const { store } = await prepareStore({
      [StoreKeys.Modals]: {
        ...new ModalsInitialState(),
        [ModalName.applicationUpdate]: { open: true, args: {} },
      },
    })

    const update = jest.fn()

    const modal = <UpdateModal.default />

    // @ts-expect-error
    jest.spyOn(UpdateModal, 'mapDispatchToProps').mockImplementation(() => ({
      handleUpdate: update,
    }))

    renderComponent(modal, store)

    const button = screen.getByText('Update now')
    fireEvent.click(button)

    expect(update).toHaveBeenCalled()
  })
})
