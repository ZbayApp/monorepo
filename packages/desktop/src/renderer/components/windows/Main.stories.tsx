import React from 'react'
import { ComponentMeta, ComponentStory } from '@storybook/react'

import Grid from '@mui/material/Grid'
import WindowWrapper from '../ui/WindowWrapper/WindowWrapper'

import { withTheme } from '../../storybook/decorators'

import { Reusable as Sidebar } from '../Sidebar/Sidebar.stories'
import SidebarComponent from '../Sidebar/Sidebar'
import { SendingMessagesWithScroll as ChannelStory } from '../Channel/Channel.stories'

const Template: ComponentStory<any> = () => {
  return (
    <WindowWrapper>
      <Grid
        container
        direction='row'
        style={{
          minHeight: '100vh',
          minWidth: '100vw',
          overflow: 'hidden',
          position: 'relative',
        }}
        wrap='nowrap'
      >
        <Grid item>
          {/* @ts-ignore */}
          <Sidebar />
        </Grid>
        <Grid item xs>
          {/* @ts-ignore */}
          <ChannelStory {...ChannelStory.args} />
        </Grid>
      </Grid>
    </WindowWrapper>
  )
}

export const Component = Template.bind({})
Component.args = {}
const component: ComponentMeta<typeof SidebarComponent> = {
  title: 'Components/Main',
  decorators: [withTheme],
  component: SidebarComponent,
}

export default component
