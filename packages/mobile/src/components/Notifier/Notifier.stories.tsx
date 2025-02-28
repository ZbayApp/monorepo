import React from 'react'
import { storiesOf } from '@storybook/react-native'

import { appImages } from '../../assets'
import { storybookLog } from '../../utils/functions/storybookLog/storybookLog.function'

import { Notifier } from './Notifier.component'

storiesOf('Notifier', module).add('Default', () => (
  <Notifier
    onButtonPress={storybookLog('button pressed')}
    onEmailPress={storybookLog('email pressed')}
    icon={appImages.update_graphics}
    title={'Coming update will remove communities & messages'}
    message={
      "Quiet's next release includes major changes to authentication and encryption that will let us offer DMs, private channels, roles, multi-device support, and user removal in future versions! 🎉 However, these changes are not backwards compatible, so you must re-install Quiet from tryquiet.org and re-create or re-join your community. 😥 This version of Quiet will no longer receive any updates or security fixes, so please re-install soon. We apologize for the inconvenience."
    }
  />
))
