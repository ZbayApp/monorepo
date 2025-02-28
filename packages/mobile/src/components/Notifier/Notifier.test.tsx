import React from 'react'
import '@testing-library/jest-native/extend-expect'
import { fireEvent, screen } from '@testing-library/react-native'

import { renderComponent } from '../../utils/functions/renderComponent/renderComponent'

import { appImages } from '../../assets'

import { Notifier } from './Notifier.component'

describe('Notifier component', () => {
  it('should match inline snapshot', () => {
    const { toJSON } = renderComponent(
      <Notifier
        onButtonPress={jest.fn()}
        onEmailPress={jest.fn()}
        icon={appImages.update_graphics}
        title={'Coming update will remove communities & messages'}
        message={
          "Quiet's next release includes major changes to authentication and encryption that will let us offer DMs, private channels, roles, multi-device support, and user removal in future versions! 🎉 However, these changes are not backwards compatible, so you must re-install Quiet from tryquiet.org and re-create or re-join your community. 😥 This version of Quiet will no longer receive any updates or security fixes, so please re-install soon. We apologize for the inconvenience."
        }
      />
    )

    expect(toJSON()).toMatchSnapshot()
  })

  it('should respond on button tap', () => {
    const buttonCallback = jest.fn()

    renderComponent(
      <Notifier
        onButtonPress={buttonCallback}
        onEmailPress={jest.fn()}
        icon={appImages.update_graphics}
        title={'Coming update will remove communities & messages'}
        message={
          "Quiet's next release includes major changes to authentication and encryption that will let us offer DMs, private channels, roles, multi-device support, and user removal in future versions! 🎉 However, these changes are not backwards compatible, so you must re-install Quiet from tryquiet.org and re-create or re-join your community. 😥 This version of Quiet will no longer receive any updates or security fixes, so please re-install soon. We apologize for the inconvenience."
        }
      />
    )

    fireEvent.press(screen.getByText('I understand'))

    expect(buttonCallback).toBeCalled()
  })
})
