import React, { useState } from 'react'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import CloseIcon from '@mui/icons-material/Close'

import { useModal } from '../../containers/hooks'
import { Box, Divider, Drawer, List, ListItem, ListItemButton, ListItemIcon, ListItemText, Typography } from '../ui'
import IconButton from '../ui/Icon/IconButton'

const PREFIX = 'SettingsModal'

const classes = {
  indicator: `${PREFIX}indicator`,
  leaveComunity: `${PREFIX}leaveCommunity`,
}

export interface SettingsComponentProps {
  open: boolean
  handleClose: () => void
  tabs: any
  leaveCommunityModal: ReturnType<typeof useModal>
  isWindows?: boolean
}

export const SettingsComponent: React.FC<SettingsComponentProps> = ({
  open,
  handleClose,
  tabs,
  leaveCommunityModal,
  isWindows,
}) => {
  const [currentTab, setCurrentTab] = useState('')

  const handleChange = (tab: string) => {
    setCurrentTab(tab)
  }

  const handleCloseTab = () => {
    setCurrentTab('')
  }

  const TabComponent = tabs[currentTab]

  return (
    <>
      <Drawer open={open} onClose={handleClose} anchor='right'>
        <List sx={{ width: '375px', paddingTop: '16px' }}>
          <ListItem sx={{ paddingBottom: '8px' }}>
            <div>
              <ListItemButton onClick={handleClose} sx={{ padding: '0px' }} data-testid={'close-settings-button'}>
                <ListItemIcon>
                  <CloseIcon />
                </ListItemIcon>
              </ListItemButton>
            </div>
            <ListItemText sx={{ textAlign: 'center' }}>
              <Typography sx={{ fontWeight: '500' }}>Community Settings</Typography>
            </ListItemText>
          </ListItem>
          <Divider />
          <ListItemButton data-testid={'about-settings-tab'} onClick={() => handleChange('about')}>
            <ListItemText>About</ListItemText>
            <ListItemIcon>
              <ChevronRightIcon />
            </ListItemIcon>
          </ListItemButton>
          <Divider />

          <ListItemButton data-testid={'notifications-settings-tab'} onClick={() => handleChange('notifications')}>
            <ListItemText>Notifications</ListItemText>
            <ListItemIcon>
              <ChevronRightIcon />
            </ListItemIcon>
          </ListItemButton>
          <Divider />

          <ListItemButton data-testid={'invite-settings-tab'} onClick={() => handleChange('invite')}>
            <ListItemText>Add Members</ListItemText>
            <ListItemIcon>
              <ChevronRightIcon />
            </ListItemIcon>
          </ListItemButton>
          <Divider />
          <ListItemButton data-testid={'qr-code-settings-tab'} onClick={() => handleChange('qrcode')}>
            <ListItemText> QR Code</ListItemText>
            <ListItemIcon>
              <ChevronRightIcon />
            </ListItemIcon>
          </ListItemButton>
          <Divider />
          <ListItemButton data-testid={'theme-settings-tab'} onClick={() => handleChange('theme')}>
            <ListItemText>Theme</ListItemText>
            <ListItemIcon>
              <ChevronRightIcon />
            </ListItemIcon>
          </ListItemButton>
          <Divider />
          {!isWindows && (
            <>
              <Divider />
              <ListItemButton
                data-testid='leave-community-settings-tab'
                className={classes.leaveComunity}
                onClick={leaveCommunityModal.handleOpen}
              >
                <ListItemText>Leave community</ListItemText>
                <ListItemIcon>
                  <ChevronRightIcon />
                </ListItemIcon>
              </ListItemButton>
            </>
          )}
          <Divider />
        </List>
      </Drawer>
      <Drawer open={currentTab !== ''} onClose={handleCloseTab} anchor='right' BackdropProps={{ invisible: true }}>
        <Box
          width={40}
          sx={{ paddingTop: '16px', paddingBottom: '8px', paddingLeft: '4px' }}
          data-testid={'close-tab-button-box'}
        >
          <IconButton onClick={handleCloseTab}>
            <CloseIcon />
          </IconButton>
        </Box>
        <Divider />
        <Box p={2} width={375}>
          {TabComponent && <TabComponent />}
        </Box>
      </Drawer>
    </>
  )
}

export default SettingsComponent
