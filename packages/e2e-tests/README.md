## Running e2e tests locally

*  Install dependencies:

`npm run bootstrap`

*  Run individual tests:

`npm run test oneClient.test.ts`

`npm run test` # Run all tests

### Locally-built Binaries

To run tests against locally built binaries:

1. In the `desktop` package, build the application:
   - Mac: `electron-builder --mac`
   - Linux: `npm run distUbuntu`

2. Run the tests:
`npm run test`

See the README in the `desktop` package for detailed build instructions for each OS.

## Test Suite

Current E2E test suite includes:
- oneClient.test.ts - Basic single client functionality
- userProfile.test.ts - User profile management
- multipleClients.test.ts - Multi-client interactions
- invitationLink.test.ts - Invitation link functionality
- backwardsCompatibility.test.ts - Version compatibility tests (CI only)

## Notes

Legacy tests pending migration can be found in commit fa1256e4d19fc481e316a09523746ce9359d4073:
- fileSending
- joiningUser
- lazyLoading
- newUser.returns