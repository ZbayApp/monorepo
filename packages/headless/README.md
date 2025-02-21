# @quiet/headless

## Running

The current jank approach to running is:

1. Create a community the normal way
2. Generate an invite link
3. Close the owner app
4. Edit the invite link in `packages/headless/src/main.ts`
5. Run `npm run bootstrap && npm run lerna -- run --scope=@quiet/headless start:dev`
6. Once the server is up reopen the owner
7. Verify that the owner connects to the server