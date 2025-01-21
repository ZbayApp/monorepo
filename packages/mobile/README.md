# Quiet Mobile

Quiet Mobile is a React Native app for Android and iOS that shares a Node.js [backend](https://github.com/TryQuiet/monorepo/tree/master/packages/backend) and a JavaScript/Redux [state manager](https://github.com/TryQuiet/monorepo/tree/master/packages/state-manager) with [Quiet Desktop](https://github.com/TryQuiet/monorepo/tree/master/packages/desktop).

## Setting up Android environment

### Prerequisites

1. If not on Mac (which comes preinstalled with `patch`), install `patch` (e.g. via your Linux package manager).

1. Install python3 and setuptools through your preferred method. (used by node-gyp)

1. In the root directory of `quiet/`, install the monorepo's dependencies and bootstrap the project with lerna. It will take care of the package's dependencies and trigger a prepublish script which builds them.

    ```bash
    npm install
    npm run bootstrap
    ```

1. On your host, install [adb](https://developer.android.com/studio/command-line/adb) (Android Debug Bridge) to communicate with your Android device.

1. If running on a physical device, enable USB debugging on your device and connect it to your computer via USB. If running on an emulator, start the emulator.

      [React Native: Running on Device](https://reactnative.dev/docs/running-on-device)
      [Android Developers: Configure Developer Options](https://developer.android.com/studio/debug/dev-options)

1. Add the path to the java binary installed by Android Studio JAVA_HOME to your environment variables. Ensure that you have followed the SDK installation instructions in the [React Native Development Environment](https://reactnative.dev/docs/set-up-your-environment) guide.

    For example, on macOS with Android Studio installed in the default location,
    Add the following line to your `~/.bash_profile` or `~/.zprofile` file,

    ```bash
    export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"
    ```

### Local development

Follow the steps in [React Native Development Environment](https://reactnative.dev/docs/set-up-your-environment) to set up your development environment.

#### Running Android App from Command Line

1. After following the React Native Development Environment instructions, navigate to the `packages/mobile` directory and run the application,

    ```bash
    npm run android
    ```

    The application should now be running on your device.

#### Running from Android Studio

1. Open the `android` directory in Android Studio.
1. If necessary, sync the Gradle files by hitting the "Sync Project with Gradle Files" button in the top right corner.
1. Select the target device or emulator and press the play button.

### Docker container

Docker container with Android development environment can be found in `packages/mobile/android-environment`.

1. Build the image,

    ```bash
    # From packages/mobile/android-environment
    docker build -t quiet-mobile-dev -f Dockerfile .
    ```

1. Export an environment variable with the path to the root of the repository,

    For bash,

    ```bash
    # From the root of the repository
    echo "export QUIET_REPO_ROOT=$(pwd)" >> ~/.bash_profile
    source ~/.bash_profile
    ```

    or for zsh

    ```bash
    # From the root of the repository
    echo "export QUIET_REPO_ROOT=$(pwd)" >> ~/.zprofile
    source ~/.zprofile
    ```

1. Then start a container and attach to it,

    ```bash
    docker run -it --rm --name quiet-mobile-debug -u node --network host --entrypoint bash --privileged -v /dev/bus/usb:/dev/bus/usb -v $QUIET_REPO_ROOT:/app quiet-mobile-dev
    ```

    Your command line should now look like `node@docker-desktop:/app/packages/mobile$`

1. Once attached to the container, start Metro, a JavaScript bundler for React Native,

    ```bash
    npm run start
    ```

    Warning: Do not select any options in the Metro terminal window.

1. Open another terminal window and start building the application,

    ```bash
    docker exec -it quiet-mobile-debug /usr/local/bin/npm run android
    ```

    The application should now be running on your device.

### Wireless debugging (optional)

**These instructions are included for convenience and may help if you're having a problem with wired debugging. Be mindful of your local network when using this option.**

To connect your debugging device wirelessly, make sure it runs on Android 11 or above.  Enable wireless debugging in the Developer Options and plug it in to your machine via USB.

Open a terminal window and tell the adb daemon to use port 5555,

```bash
adb tcpip 5555
```

Then check your phone's IP address and connect to it

```bash
adb connect <phone-ip>:5555
```

Unplug your phone and repeat the last command in the Docker container section to build the application with the new port.

### Access Android application logs

Open a terminal window,

```bash
adb logcat --pid=$(adb shell pidof -s com.quietmobile.debug)
```

### Locally linking packages (mobile) (optional)

Metro requires additional step for locally linking packages. After running standard `npm link` commands, update `metro.config.js` as follows

```bash
const watchFolders = [
  ...
  path.resolve(__dirname, '<path-to-linked-package>')
]
```

## Setting up iOS environment

### Prerequisites for iOS development

1. Install [Xcode](https://developer.apple.com/xcode/) from the Mac App Store.
1. Follow the [React Native Development Environment](https://reactnative.dev/docs/set-up-your-environment) instructions to set up your development environment.
1. Install rbenv, a Ruby version manager.

    ```bash
    brew install rbenv
    ```

1. Set your Ruby version to the suggested version.

    At the time of writing, the suggested Ruby version is 2.7.5

    ```bash
    rbenv install 2.7.5
    rbenv global 2.7.5
    ```

1. Install ruby dependencies from the Gemfile in the `packages/mobile` directory.

    ```bash
    gem install bundler
    bundle install
    ```

1. Install the pods for the iOS project.

    ```bash
    cd ios
    bundle exec pod install
    ```

1. Open the `ios` directory in Xcode.

1. If planning to run on device, setup the signing certificate and provisioning profile in Xcode.

    [React Native: Running on Device](https://reactnative.dev/docs/running-on-device)

### Running iOS App With Command Line

1. Start the Metro bundler,

    From the `packages/mobile` directory,

    ```bash
    npm run start
    ```

1. Build and run the application,

      From the `packages/mobile` directory,

      ```bash
      npm run ios
      ```

      or from Xcode, select the target device and press the play button.

      The application should now be running on your device.

### Xcode

1. Start the metro bundler,

    From the `packages/mobile` directory,

    ```bash
    npm run start
    ```

1. Open the `ios` directory in Xcode.
1. Select the target device or simulator and press the play button.

## Running E2E tests (optional)

We use [Detox](https://wix.github.io/Detox/) for E2E testing on mobile.
Detox recommends to install its `detox-cli` globally, enabling usage of the command line tools outside npm scripts.

```bash
npm install detox-cli --global
```

> NOTE: From this point, we recommend to operate within a docker container provided for Android development (unless you have an environment already set up locally)

Choose proper configuration depending on the os and target device and pass it with `-configuration` flag when building and running tests.
(The configuration has a following pattern: `<OS>.<DEVICE-TYPE>.<BUILD-TYPE>`, eg. for ios debug simulator use `ios.sim.debug` and for android release tested on an attached device use `android.att.release`)

There're two commands to use:
(remember to prefix commands with `npx` if using globally installed `detox-cli`)

The first one for building binary file to put under test:

```bash
detox build --configuration android.att.debug
```

And the second one for actually running the tests:
(let's trigger the basic set of e2e tests called `starter`)

```bash
detox test starter --configuration android.att.debug
```

For more detailed instructions, see [Detox:Your First Test](https://wix.github.io/Detox/docs/introduction/your-first-test/)

## Running visual regression tests

> NOTE: See the building instructions in the previous section

There's a flag for enabling screenshot comparison during e2e tests `-enable-visual-regression`.

In order to perform comparision, the presence of a base screenshots is required under `e2e/visual-regressions/<ENVIRONMENT>/<PLATFORM>/<TEST>-base-screenshots` (where `<ENVIRONMENT>` can be either `local` or `ci`). The easiest way to generate them is to go through the test using `-base-update` flag.

> NOTE: Actual base snapshots hosted in the repo were generated with iPhone 14 simulator and serves as a baselines for automated runs

There're two types of tests: a basic (starter) set of e2e tests, and an app-wide visual regression test which uses storybook.
For the second type, it's important to use a `storybook` variant of the build

```bash
detox test storybook --configuration android.att.storybook -- -enable-visual-regression
```

Tests can also be started at a particular story pointed out using `-starting-story=<STORY-NAME>` flag.

## Development hints

React-native projects consists of two parts: javascript code and native code. Native code lives within the `/android` and `/ios` folder.

### IDE

If you only wish to make changes to the react-native part of the project, simply use your favorite code editor.
Altough if you plan to modify the native code, Android Studio is recommended as it simplifies things a lot and Xcode is required to be able to work with iOS.

### When to rebuild the project?

Both Android and iOS manages their own dependencies with the help of `gradle` (Android) and `cocoapods` (iOS). They work similar to `npm`.
Whenewer there're changes to the dependencies in the native projects (`build.gradle` or `podfile`) there's a need to sync gradle files (it's fairly easy to do with Android Studio) or to run `pod install` command from the `/ios` directory. It doesn't happen very often but may be a case while attaching react-native modules getting use of the native methods (eg. for file management).

If changes are made to the native part of the project (java, kotlin, objc or swift) it's neccessary to rebuild the project (`npm run android`, `npm run ios`)

React-native uses a tool called metro to bundle javascript files. It does it on runtime, before processing react-native code. Depending on the size of cached files it may take several seconds to fully load the bundled js code. When a change is made to the javascript codebase, it's usually enough to reload files with metro, by pressing `R` from within the console in which metro operates.

### Access iOS simulator files system

Find proper directory by running

```bash
xcrun simctl get_app_container booted com.quietmobile data
```

enter it and find directory data within `/Documents` folder

### The app is stuck on splash screen

Sometimes metro loader takes long enough to cause a race condition failure with the native service notifying javascript code about the data of websocket server
we use to communicate with backend. In this case, we should be able to observe a log informing us that an event has been emitted but there was nothing to receive it:

```bash
WEBSOCKET CONNECTION: Starting on 11000
RCTNativeAppEventEmitter: Tried to send an event but got NULL on reactContext
```

The easiest solution is to close the app and open it again by tapping it's icon on the device (there's no need to rebuild the project) (Android/iOS)
or to follow `Product -> Perform Action -> Run Without Building` in Xcode. (iOS)

If it's not enough, you can locally increase the `WEBSOCKET_CONNECTION_DELAY` for emitting the event at `mobile/android/app/src/main/java/com/quietmobile/Utils/Const.kt` (Android)

## Troubleshooting

### Could not set file mode 644 on

Gradle copies the dependencies of nested nodejs project. It may encounter problems with access rights. To solve that make sure, you run docker container as file's owner (`-u` flag). node user has uid 1000 - make sure it's the same as owner's uid. You can pass (numeric) uid instead of user name when running docker container.

### Can't find file to patch at input line 3

Mobile package uses several patches for external dependencies. If you encounter problems with applying those patches because of missing target file, you'll be prompted to provide the path. Use absolute (local) path to the file, eg. `usr/linux/quiet/packages/state-manager/node_modules/factory-girl/package.json`.

### Invalid symlink at

Built app bundle cannot contain symlinks linking outside the package (which sometimes happens when symlink uses absolute path). In this case one needs to change the symlink to relative path. It can be achieved by adding a custom built task either in Gradle or Xcode.

### Unable to resolve module

Usage of native methods (like the ones for file management) must be adapted for mobile environment. There're several ways to fix the issue with incompatible packages/files:

1. Shim packages with `rn-dodeify` <https://www.npmjs.com/package/rn-nodeify>
2. Blacklist certain files in `metro.config.js:30`
3. Use diff & patch <https://www.freecodecamp.org/news/compare-files-with-diff-in-linux/>

### Process already running on :8081

If you encounter a problem with metro bundler, make sure there's no other process running on the same port. If it's the case, kill the process and try again.

Get the PID of the process:

```bash
lsof -i :8081
```

Kill the process:

```bash
kill -9 <PID>
```
