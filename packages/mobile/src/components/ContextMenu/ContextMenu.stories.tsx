import React from 'react'

import { storiesOf } from '@storybook/react-native'

import { ContextMenu } from './ContextMenu.component'
import { ContextMenuItemProps } from './ContextMenu.types'

import { createLogger } from '../../utils/logger'

const logger = createLogger('contextMenu:stories')

const community_items: ContextMenuItemProps[] = [
  {
    title: 'Create channel',
    action: () => {
      logger.info('clicked on create channel')
    },
  },
  {
    title: 'Add members',
    action: () => {
      logger.info('clicked on add members')
    },
  },
  {
    title: 'Settings',
    action: () => {
      logger.info('clicked on settings')
    },
  },
]

const invitation_items: ContextMenuItemProps[] = [
  {
    title: 'Copy link',
    action: () => {
      logger.info('clicked on copy link')
    },
  },
  {
    title: 'Cancel',
    action: () => {
      logger.info('clicked on cancel')
    },
  },
]

storiesOf('ContextMenu', module)
  .add('Community', () => {
    return (
      <ContextMenu
        title={'Rockets'}
        items={community_items}
        visible={true}
        handleClose={() => {
          logger.info('closing menu')
        }}
      />
    )
  })
  .add('Invitation', () => {
    return (
      <ContextMenu
        title={'Add members'}
        items={invitation_items}
        hint={'Anyone with Quiet app can follow this link to join this community. Only share with people you trust.'}
        link={`https://tryquiet.org/join#12D3KooWKCWstmqi5gaQvipT7xVneVGfWV7HYpCbmUu626R92hXx=vag3ot2imv7lrwsqesv2qykyx2fxenvjfcawgngab6gjzo2gg5o5vqqd&12D3KooWHgLdRMqkepNiYnrur21cyASUNk1f9NZ5tuGa9He8QXNa=sdiy7sermcmtaomn4w3bnxlmdqoun5bxre34xfcaxckhy7obhphcypad&12D3KooWPYjyHnYYwe3kzEESMVbpAUHkQyEQpRHehH8QYtGRntVn=pr42dxkelrs5iy2a4n4ycv2ptzk4yur274hq2zfshvgxu5rpay6lghqd&12D3KooWSYQf8zzr5rYnUdLxYyLzHruQHPaMssja1ADifGAcN3qY=ka5m3rho2gvldgmigp7jn5taok7nwyp5v2fix3jdirpsyf7rdm547cqd`}
        visible={true}
        handleClose={() => {
          logger.info('closing menu')
        }}
      />
    )
  })
