import 'typeface-roboto'
import React from 'react'
import CssBaseline from '@mui/material/CssBaseline'
import { ThemeProvider, StyledEngineProvider } from '@mui/material/styles'
import { Provider } from 'react-redux'
import { HashRouter, Route, Routes } from 'react-router-dom'
import { PersistGate } from 'redux-persist/integration/react'
import { persistStore } from 'redux-persist'
import store from './store'
import Index from './containers/windows/Index'
import Main from './containers/windows/Main'
import CreateUsername from './components/CreateUsername/CreateUsername'
import SentryWarning from './containers/widgets/sentryWarning/sentryWarning'
import SettingsModal from './components/Settings/Settings'
import UpdateModal from './containers/widgets/update/UpdateModal'
import QuitAppDialog from './containers/ui/QuitAppDialog'
import { useTheme } from './theme'
import CreateCommunity from './components/CreateJoinCommunity/CreateCommunity/CreateCommunity'
import JoinCommunity from './components/CreateJoinCommunity/JoinCommunity/JoinCommunity'
import CreateChannel from './components/Channel/CreateChannel/CreateChannel'
import LoadingPanel from './components/LoadingPanel/LoadingPanel'
import { HTML5Backend } from 'react-dnd-html5-backend'
import { DndProvider } from 'react-dnd'
import { ErrorModal } from './components/ui/ErrorModal/ErrorModal'
import { LeaveCommunity } from './components/Settings/Tabs/LeaveCommunity/LeaveCommunity'
import SearchModal from './components/SearchModal/SearchModal'
import WarningModal from './containers/widgets/WarningModal/WarningModal'
import { ChannelContextMenu } from './components/ContextMenu/menus/ChannelContextMenu.container'
import { UserProfileContextMenu } from './components/ContextMenu/menus/UserProfileContextMenu.container'
import { DeleteChannel } from './components/Channel/DeleteChannel/DeleteChannel'
import ChannelCreationModal from './components/ChannelCreationModal/ChannelCreationModal'
import { SaveStateComponent } from './components/SaveState/SaveStateComponent'
import UnregisteredModalContainer from './components/widgets/userLabel/unregistered/UnregisteredModal.container'
import DuplicateModalContainer from './components/widgets/userLabel/duplicate/DuplicateModal.container'
import UsernameTakenModalContainer from './components/widgets/usernameTakenModal/UsernameTakenModal.container'
import PossibleImpersonationAttackModalContainer from './components/widgets/possibleImpersonationAttackModal/PossibleImpersonationAttackModal.container'
import BreakingChangesWarning from './containers/widgets/breakingChangesWarning/BreakingChangesWarning'
import { communities } from '@quiet/state-manager'
// Trigger lerna

export const persistor = persistStore(store)

export default () => {
  return (
    <StyledEngineProvider injectFirst>
      <ThemeProvider theme={useTheme()}>
        <DndProvider backend={HTML5Backend}>
          <HashRouter>
            <Provider store={store}>
              <PersistGate loading={null} persistor={persistor}>
                <SentryWarning />
                <WarningModal />
                <UnregisteredModalContainer />
                <DuplicateModalContainer />
                <SearchModal />
                <ErrorModal />
                <PossibleImpersonationAttackModalContainer />
                <LoadingPanel />
                <UsernameTakenModalContainer />
                <ChannelCreationModal />
                <CreateChannel />
                <JoinCommunity />
                <CreateCommunity />
                <CreateUsername />
                <CssBaseline />
                <SettingsModal />
                <UpdateModal />
                <BreakingChangesWarning />
                <QuitAppDialog />
                <ChannelContextMenu />
                <UserProfileContextMenu />
                <DeleteChannel />
                <Routes>
                  <Route index path='/' element={<Index />} />
                  <Route path='/main/*' element={<Main />} />
                </Routes>
                <SaveStateComponent persistor={persistor} />
              </PersistGate>
            </Provider>
          </HashRouter>
        </DndProvider>
      </ThemeProvider>
    </StyledEngineProvider>
  )
}
