import React, { FC, useEffect } from 'react'
import { View } from 'react-native'
import { useDispatch, useSelector } from 'react-redux'
import { identity, communities, CommunityOwnership, CreateNetworkPayload } from '@quiet/state-manager'
import { JoinCommunity } from '../../components/JoinCommunity/JoinCommunity.component'
import { navigationActions } from '../../store/navigation/navigation.slice'
import { ScreenNames } from '../../const/ScreenNames.enum'

export const JoinCommunityScreen: FC = () => {
  const dispatch = useDispatch()
  
  const currentIdentity = useSelector(identity.selectors.currentIdentity)

  useEffect(() => {
    if (currentIdentity && !currentIdentity.userCertificate) {
      dispatch(navigationActions.replaceScreen({ 
        screen: ScreenNames.UsernameRegistrationScreen
       }))
    }
  }, [dispatch, currentIdentity])

  const joinCommunityAction = (address: string) => {
    const payload: CreateNetworkPayload = {
      ownership: CommunityOwnership.User,
      registrar: address
    }
    dispatch(communities.actions.createNetwork(payload))
  }

  return (
    <View style={{ flex: 1 }}>
      <JoinCommunity joinCommunityAction={joinCommunityAction} />
    </View>
  )
}
