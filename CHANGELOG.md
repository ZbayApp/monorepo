# Changelog

## [unreleased]

### New features

* Adds basic sigchain functions ([#2625](https://github.com/TryQuiet/quiet/issues/2625))
* Instantiates signature chain when creating communities and reloading application ([#2626](https://github.com/TryQuiet/quiet/issues/2626))
* Added in LFA-ready invite links ([#2627](https://github.com/TryQuiet/quiet/issues/2627))

## [2.3.2]

### Chores

* Moved some responsibilities of identity management to the backend ([#2602](https://github.com/TryQuiet/quiet/issues/2602))
* Added auth submodule in preparation for future encyrption work ([#2623](https://github.com/TryQuiet/quiet/issues/2623))

### Fixes

* Fixed memory leak associated with autoUpdater ([#2606](https://github.com/TryQuiet/quiet/issues/2606))
* Fixed visual regression tests ([#2644](https://github.com/TryQuiet/quiet/issues/2645))

## [2.3.1]

### Fixes

* The user profile area is now much easier to click on desktop, and has a nice hover effect matching the rest of the sidebar ([#2566](https://github.com/TryQuiet/quiet/issues/2566)) Thanks @okrayrum!
* Android app will now work correctly after suspending it (e.g. by swiping up in the app manager) ([#2587](https://github.com/TryQuiet/quiet/issues/2587))

## [2.3.0]

### New features

* Add dark mode to the desktop UI ([#1502](https://github.com/TryQuiet/quiet/issues/1502))
* Add support for new format of invitation link: `c=<cid>&t=<token>&s=<serverAddress>&i=<inviterAddress>` ([#2310](https://github.com/TryQuiet/quiet/issues/2310))
* Use server for downloading initial community metadata if v2 invitation link is detected ([#2295](https://github.com/TryQuiet/quiet/issues/2295))

### Refactorings

* Consolidate colors and align theme with MUI standards ([#2445](https://github.com/TryQuiet/quiet/issues/2445))
* Refactor some UI components to align with architecture goals ([2447](https://github.com/TryQuiet/quiet/issues/2447))

### Fixes

* Disable spellCheck/autoCorrect on non-spelling sensitive fields like usernames and channels ([#373](https://github.com/TryQuiet/quiet/issues/373))
* Fixes issue with reconnecting to peers on resume on iOS ([#2424](https://github.com/TryQuiet/quiet/issues/2424))
* Fixes references to 'invite code' to be 'invite link' in UI ([#2441](https://github.com/TryQuiet/quiet/issues/2441))
* Fixes issue with image messages not displaying/throwing errors on iOS ([#2526](https://github.com/TryQuiet/quiet/issues/2526))

### Chores

* Cleanup data directory at end of e2e tests
* Update mobile development README ([#2483](https://github.com/TryQuiet/quiet/issues/2483))
* Update github workflows for PR gating ([#2487](https://github.com/TryQuiet/quiet/issues/2487))
* Don't create duplicate CSRs when joining a community under certain circumstances ([#2321](https://github.com/TryQuiet/quiet/issues/2321))
* Add abstract base classes for stores ([#2407](https://github.com/TryQuiet/quiet/issues/2407))

## [2.2.0]

### New features

* Add utilities for emoji detection in messages and make all-emoji message larger font size ([#519](https://github.com/TryQuiet/quiet/issues/519))

### Refactorings

* Use ack for CREATE_NETWORK and simplify
* Move Community model to the backend

### Fixes

* Allow JPEG and GIF files as profile photos ([#2332](https://github.com/TryQuiet/quiet/issues/2332))
* Fix issues with recreating general channel when deleted while offline ([#2334](https://github.com/TryQuiet/quiet/issues/2334))
* Fix package.json license inconsistency
* Fixes issue with reconnecting to peers on resume on iOS ([#2424](https://github.com/TryQuiet/quiet/issues/2424))
* Reorder the closing of services, prevent sagas running multiple times and close backend server properly

## [2.1.2]

### Refactorings

* Rename and reorganize frontend/backend events API
* Rename message retrieval events/sagas and use ack feature
* Rename LOAD_MESSAGES event and incomingMessages reducer
* Use socket.io ack for CREATE_CHANNEL event
* Introduce socket.io acknowledgements

### Fixes

* Fixes channel name creation logic
* Remove duplicate introduction messages once again
* Prevent channel creation with names that start with special character, then a hyphen
* Choose random ports for Tor services (iOS)
* Use consistent identicons for messages and profile
* Add retry ability to tor-control and misc tor-control fixes

## Other

* Upgraded React-Native to 0.73.2

## [2.1.1]

### Fixes

* Make sure address of the inviting peer is in the invitation link
* Opening the mobile app with joining links has been corrected.

### Refactorings

* Remove unused backend events and state-manager event types

## [2.1.0]

### New features

* Added user profile feature.
* Updated old logo of Linux and Windows with rounded ones.

### Fixes

* Handle spaces in tor process path.
* Run tor process in shell.

### Refactorings

* Refactor registration service, replace promise waiting mechanism around certificate requests and help prevent duplicate username registration
* Removed SAVE_OWNER_CERTIFICATE event.
* Removed registrar reminders and rename LAUNCH_REGISTRAR.
* Removed unused SEND_USER_CERTIFICATE event.
* Removed unused SUBSCRIBE_FOR events.

## [2.0.1]

### Fixes

* Desktop UI console errors/warnings have been cleaned up.
* The channel context menu is now enabled for all users.
* A bug that impersonated the channel creation message due to the removal of the username has been fixed.
* Large file downloads are now slower but steadier.
* The username changing form has been fixed.
* Push notifications runtime permission is now requested on Android.
* Users joining a community will no longer receive multiple "welcome" messages.
* Users sharing the same nickname now have different profile images.

## [2.0.0]

### Breaking changes

* To let users join when the owner is offline we made changes that broke backwards compatibility, so you will need to create a new community and re-invite members. Need help migrating? [help@quiet.chat](mailto:help@quiet.chat)

### New features

* Users can join a community when its owner is offline. This was a big one!
* Desktop and mobile users can send markdown messages. (Thanks again @josephlacey!)
* Desktop users can now export chats to a text file. (Thanks @rajdip-b!)

### Improvements

* Prettier message loading indicator on mobile
* Better descriptions of the joining process
* Validation of community metadata and certificates
* A real iOS launch screen (so long, "Powered by React Native"!)
* A nice splash screen on mobile until the joining/creating screens are ready
* Clearer autoupdate language in the update modal, so users know that the app will update on restart

### Fixes

* Mobile apps should no longer crash on restart.
* Joining community no longer gets stuck on "initiating backend modules."
* Invalid peer addresses in peer list are now filtered out, and peer list is updated in localdb.
* Peers now dial new users without having to restart.
* Up/down arrows are now working properly inside channel input. (Thanks @josephlacey!)
* Long messages are no longer truncated in channelInput component.
* Users can change between "join community" and "create community" screens without errors about a missing required field.
* On iOS, there's more weird empty space between the input field and the soft keyboard.
* The UI for users already in a community joining a new community is no longer misleading, so users will not accidentally leave a community by opening a new invite link.
* Desktop settings now open the "invite" tab by default, as they were meant to.
* We now initialize electron-store after setting appData to prevent creating an empty "Quiet" data directory.

### Notes

* Quiet now labels duplicate unregistered usernames
* Quiet shows an full-screen warning for duplicate registered usernames, since these should never happen and indicate a potential compromise.
* For authenticating connections, Quiet now uses libp2p's [Pre-shared Key Based Private Networks](https://github.com/libp2p/specs/blob/master/pnet/Private-Networks-PSK-V1.md) instead of X.509 certificates so peers can connect before registering.

## [2.0.3-alpha.16]

* Fix: mobile app crashing on restart

* Refactor: backend, storage module - extracting OrbitDB as another provider, refactor of  CertificatesRequestsStore, CommunityMetadataStore, CertificatesStore as Nest providers, store tests adjustments,  file structure

## [2.0.3-alpha.15]

* Fix: construct all stores before initializing them - initializing community metadata store sets metadata in certificates store

* Fix: joining community stuck on "initiation backend modules"

* Add debug logs.

## [2.0.3-alpha.14]

* Add community metadata validation.

* Move community metadata to separate store.

## [2.0.3-alpha.13]

* Initialize electron-store after setting appData to prevent creating empty "Quiet" data directory

* Fixed UI for Update Modal

* Fixed username taken logic

* Add test-case in e2e multiple test for using username taken modal

## [2.0.3-alpha.12]

* Better descriptions of the joining process

* Update custom deps repositiries (upload-s3-action, ipfs-pubsub-peer-monitor)

* Add certificates validation.

* Move certificates to separate store.

* Move csrs to separate store.

* Fix saveUserCsr saga to trigger only if user csr is absent in user slice.

* Send an info message immediately after a user joins the community

* Feature: add functionality to export chat to text document in desktop version

## [2.0.3-alpha.6]

* Fix: filter out invalid peer addresses in peer list. Update peer list in localdb.

* Fix: dial new peers on CSRs replication

## [2.0.3-alpha.5]

* Fix network data proceeding when using custom protocol multiple times #1847

* Backward incompatible change: use pre shared key as connection protector in libp2p. Add libp2p psk to invitation link

* Removed code responsible for data translation from channel address to channel id from state manager transforms and storage service

## [2.0.3-alpha.1]

* Temporarily hiding leave community button from Possible impersonation attack

## [2.0.3-alpha.0]

* Filter CSRs - remove old csrs and replace with new for each pubkey

* Fixed mobile bugs - joining by QR code and not showing username taken screen for user who has unique name

* Use context menu for information about unregistered username instead screen

* Shorter dots-placeholder for invite link

* Display a shorter invite link on a mobile

* Removed registration attempts selector and corresponding usage.

* Revert adjusting bootstrap scripts for developing on Windows

* Channel input - replaced ContentEditable with textarea

* Fix - up/down arrows now work properly inside channel input (textarea)

## [2.0.1-alpha.2]

* UI layer for taken usernames for desktop and mobile

* Change nickname for taken username

* Map messages sent before changing username

* Update registrar service to match new registration flow.

* Add possible impersonation attack UI for desktop and mobile

* Fix truncated long messages in channelInput component

* Unblock mobile e2e tests

* Prettify loading component on Chat screen (mobile)

* Running Chromatic tests for forked PRs

* Added e2e test for user joining community when owner is offline. Improved e2e tests

* Bump github actions/* to versions using node16

* Project can now be bootstraped on Windows (powershell)

* Placeholder(...) for community name

* No unregistered/duplicated label for system messages

## [2.0.0-alpha.11]

* Customize Launch Screen on iOS

* Suspends certain websocket events until backend becomes fully operative (faster and dumber frontend).

* Replaced greying out inputs with splash screen on joining/creating screens.

* Fixes empty space between chat's input and a soft keyboard on iOS devices.

* Changed registration process - user connects to the libp2p network directly instead of using registrar. Invitation link format changed. User csr is now saved to database.

* Fixed android stucking on username registration screen introduced in previous alpha.

* Added creator username to initial channel message.

* Fixed bug with changing joining community/create community screens with required field.

* Fixed bug with displaying incorrect default settings tab.

* Replaced source of publicKey in sendMessage saga to CSR

* Labels for unregistered and duplicate usernames with modals

* Fixed LoadingPanel useEffect bug.

* Use csrs instead of certificates as a source of user data

* Integration state manager layer with UI layer(desktop and mobile)

* Clarify autoupdate language in update modal to let users know that the app will update on restart.

* C4 for Quiet architecture. Context and Container diagrams.

* Invite tab as default in settings
