import React from 'react'
import { ComponentStory, ComponentMeta } from '@storybook/react'

import { withTheme } from '../../../../storybook/decorators'
import QRCodeComponent, { QRCodeProps } from './QRCode.component'
import { composeInvitationShareUrl } from '@quiet/common'

const invitationLink = composeInvitationShareUrl({
  pairs: [
    {
      peerId: '12D3KooWHgLdRMqkepNiYnrur21cyASUNk1f9NZ5tuGa9He8QXNa',
      onionAddress: 'p3oqdr53dkgg3n5nuezlzyawhxvit5efxzlunvzp7n7lmva6fj3i43ad',
    },
    {
      peerId: '12D3KooWKCWstmqi5gaQvipT7xVneVGfWV7HYpCbmUu626R92hXx',
      onionAddress: 'vnywuiyl7p7ig2murcscdyzksko53e4k3dpdm2yoopvvu25p6wwjqbad',
    },
  ],
  psk: '12345',
  ownerOrbitDbIdentity: 'testOwnerOrbitDbIdentity',
})

const Template: ComponentStory<typeof QRCodeComponent> = args => {
  return <QRCodeComponent {...args} />
}

export const Component = Template.bind({})

const args: QRCodeProps = {
  value: invitationLink,
}

Component.args = args

const component: ComponentMeta<typeof QRCodeComponent> = {
  title: 'Components/QRCode',
  decorators: [withTheme],
  component: QRCodeComponent,
}

export default component
