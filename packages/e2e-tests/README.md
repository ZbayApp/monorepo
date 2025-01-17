## Running tests locally

*  Install chromedriver correctly before running the tests:

`export ELECTRON_CUSTOM_VERSION=23.0.0`
`npm run bootstrap`


*  Run jest:

`npm run test`

### Locally-built Binaries

To run against binaries built locally (which will be in the `/dist` folder) you can run

```
npm run test:localBinary
```

This passes the `IS_LOCAL` flag and will use local binaries in the `/dist` directory (if the OS has been configured for it in the tests).  Check the README in the `desktop` package for information on building binaries for each OS.

*You must compile the binary prior to running this command or it will fail!*

Convenience methods can be found in the root `package.json` for building the binary before running the tests.


## Notes

The rest of the tests to be rewritten have been left on this commit fa1256e4d19fc481e316a09523746ce9359d4073
-fileSending
-joiningUser
-lazyLoading
-newUser.returns

In the current approach, installers are taken from github releases, but in the future the application will be built on CI
