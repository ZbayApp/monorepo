import React, { FC, useCallback } from 'react'
import { Linking } from 'react-native'
import { Notifier } from '../../components/Notifier/Notifier.component'
import { appImages } from '../../assets'
import { useDispatch } from 'react-redux'
import { navigationActions } from '../../store/navigation/navigation.slice'

export const NotifierScreen: FC = () => {
  const dispatch = useDispatch()

  const redirection = useCallback(() => {
    dispatch(navigationActions.pop())
  }, [dispatch])

  const helpline = useCallback(async () => {
    const link = 'mailto:help@quiet.chat'
    await Linking.openURL(link)
  }, [])

  return (
    <Notifier
      onButtonPress={redirection}
      onEmailPress={helpline}
      icon={appImages.update_graphics}
      title={'Coming update will remove communities & messages'}
      message={
        'Quiet’s next release includes major updates to OrbitDB and IPFS! 🎉 However, these changes are not backwards compatible, so you must re-install Quiet from tryquiet.org and re-create or re-join your community. 😥 This version of Quiet will no longer receive any updates or security fixes, so please re-install soon. We apologize for the inconvenience.'
      }
    />
  )
}
