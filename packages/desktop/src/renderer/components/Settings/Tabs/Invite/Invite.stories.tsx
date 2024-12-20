import React from 'react'
import { ComponentStory, ComponentMeta } from '@storybook/react'
import { withTheme } from '../../../../storybook/decorators'
import { InviteComponent, InviteComponentProps } from './Invite.component'
import { composeInvitationShareUrl } from '@quiet/common'

const Template: ComponentStory<typeof InviteComponent> = args => {
  return <InviteComponent {...args} />
}

export const Component = Template.bind({})
let revealInputValue = true
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
    {
      peerId: '12D3KooWPYjyHnYYwe3kzEESMVbpAUHkQyEQpRHehH8QYtGRntVn',
      onionAddress: '6vu2bxki777it3cpayv6fq6vpl4ke3kzj7gxicfygm55dhhtphyfdvyd',
    },
    {
      peerId: '12D3KooWSYQf8zzr5rYnUdLxYyLzHruQHPaMssja1ADifGAcN3qY',
      onionAddress: 'y7yczmugl2tekami7sbdz5pfaemvx7bahwthrdvcbzw5vex2crsr26qd',
    },
  ],
  psk: '12345',
  ownerOrbitDbIdentity: 'testOwnerOrbitDbIdentity',
})
const args: InviteComponentProps = {
  invitationLink: invitationLink,
  revealInputValue: revealInputValue,
  handleClickInputReveal: () => {
    revealInputValue = !revealInputValue
  },
}

Component.args = args

const component: ComponentMeta<typeof InviteComponent> = {
  title: 'Components/InviteFriend',
  decorators: [withTheme],
  component: InviteComponent,
}

export default component
