import React, { useCallback, useEffect } from 'react'
import { useTheme } from '@mui/material'
import { ModalName } from '../../../sagas/modals/modals.types'
import { useModal } from '../../hooks'
import UpdateModalComponent from '../../../components/widgets/update/UpdateModalComponent'

import Button from '@mui/material/Button'

import { shell } from 'electron'
import { Site } from '@quiet/common'

const BreakingChangesWarning = () => {
  const modal = useModal(ModalName.breakingChangesWarning)
  const theme = useTheme()

  const title = 'Update available'
  const message =
    'Quiet’s next release includes major updates to OrbitDB and IPFS! 🎉 However, these changes are not backwards compatible, so you must re-install Quiet from tryquiet.org and re-create or re-join your community. 😥 This version of Quiet will no longer receive any updates or security fixes, so please re-install soon. We apologize for the inconvenience.'

  const updateAction = useCallback(() => {
    shell.openExternal(`${Site.MAIN_PAGE}#Downloads`)
  }, [])

  useEffect(() => {
    modal.handleOpen() // Open modal once per app start
  }, [])

  const updateButton = (
    <Button
      variant='contained'
      size='large'
      color='primary'
      type='submit'
      onClick={updateAction}
      style={{
        height: 55,
        fontSize: '0.9rem',
        backgroundColor: theme.palette.colors.quietBlue,
      }}
      fullWidth
    >
      Install Quiet 3.x
    </Button>
  )

  const dismissButton = (
    <Button
      variant='text'
      size='large'
      color='primary'
      type='submit'
      onClick={modal.handleClose}
      style={{
        height: 'auto',
        padding: 0,
        marginBottom: 0,
        fontSize: '0.9rem',
        color: theme.palette.colors.gray70,
        backgroundColor: theme.palette.colors.white,
      }}
      fullWidth
    >
      Later
    </Button>
  )

  return <UpdateModalComponent {...modal} buttons={[updateButton, dismissButton]} title={title} message={message} />
}

export default BreakingChangesWarning
