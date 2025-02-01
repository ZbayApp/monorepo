import React from 'react'
import { useModal } from '../../containers/hooks'
import { ModalName } from '../../sagas/modals/modals.types'
import { About } from '../widgets/Settings/About'
import { Notifications } from './Tabs/Notifications/Notifications'
import { Invite } from './Tabs/Invite/Invite'
import { QRCode } from './Tabs/QRCode/QRCode'
import { Theme } from './Tabs/Theme/Theme'
import SettingsComponent from './SettingsComponent'

const Settings = () => {
  const modal = useModal(ModalName.accountSettingsModal)

  const tabs = {
    about: About,
    notifications: Notifications,
    invite: Invite,
    qrcode: QRCode,
    theme: Theme,
  }

  const leaveCommunityModal = useModal(ModalName.leaveCommunity)

  const isWindows = process.platform === 'win32'

  return <SettingsComponent tabs={tabs} leaveCommunityModal={leaveCommunityModal} {...modal} isWindows={isWindows} />
}

export default Settings
