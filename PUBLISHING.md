<p>
  <h1 align="center">
    <b>Publishing instruction for the core team developers.</b>
  </h1>

  <h3 align="center">
    Current release owner ✨<a href='https://github.com/adrastaea'>@adrastaea</a>✨ (September 2024)
  </h3>

  <br />
  <br />
</p>

## Release Trigger

- [ ] [Quiet Planning Board](https://github.com/orgs/TryQuiet/projects/3) is up to date
- [ ] All issues to be included from `Sprint` are merged and moved to `Merged`
- [ ] `Ready for QA` column is empty of issues from previous releases

## Branching Rules

1. Release branches are based on the `develop` branch.
1. Release branches are named after the version number, e.g. `2.1.0` not the pre-release version number, e.g. `2.1.0-alpha.1`.
1. Once a release branch is created, it is frozen and no new features are to be merged into it. Only bug fixes are allowed.
1. Release branches are never deleted.
1. Any hotfixes for the release branch are merged into the release branch and then cherry-picked into the `develop` branch if necessary.

```plaintext
# Example of branching strategy
/develop  ->      /2.1.0       ->  #patch-commit
          ->  #feature-commit  ->  #patch-commit (cherry-picked)  -> /2.2.0
                                                                  -> ...
```

## Release Flow

1. Prepare a release candidate (alpha).
1. Deliver the alpha to QA.
1. QA tests the alpha.
1. If QA finds issues, a github issue is created and moved to the `Sprint` column. Any fixes are merged into the release branch and `develop` branch.
1. If QA finds no issues, the release is approved.
1. A production release is built.
1. QA tests the production release.
1. Production release is published.

## Checklist Before Alpha Release

- [ ] Release branch is created from `develop` branch with the production version number, e.g. `2.1.0`.
- [ ] Reviewed the base `CHANGELOG.md` file and ensured that it is up to date with all changes included in the release since the last production release. Package level `CHANGELOG.md` files are automatically updated during the release process.
- [ ] Reviewed the [Quiet Planning Board](https://github.com/orgs/TryQuiet/projects/3) and ensured all issues contained in the release candidate are in the `Ready for QA` column.

## Preparing a Release Candidate (Alpha)

Alpha releases are pre-release versions of the release which are delivered to QA for testing. They are versioned with a pre-release version number, e.g. `2.1.0-alpha.0`.

1. Generate a [Github Personal Access Token](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens#) and set it as `GH_TOKEN` environment variable (or include it in the command as shown below).
1. Trigger a pre-release with `GH_TOKEN=<token> npm run publish --release=[prepatch|preminor|premajor|<EXACT_VERSION>]` (e.g. to create a prerelease of a minor update `npm run publish --release=preminor`) This will increment the versions of every package that has changed, create a release on the [Releases Page](https://github.com/TryQuiet/quiet/releases), and trigger Github Actions to deploy the alpha release to the Google Play Store and App Store.
1. Manually update the release notes on the [Releases Page](https://github.com/TryQuiet/quiet/releases) with the changes included in the alpha release. See [RELEASE_NOTES_GUIDE.md](RELEASE_NOTES_GUIDE.md) for guidance on writing release notes.
1. Promote the alpha release on the [Google Play Console](https://play.google.com/console/) to a closed testing track. Contact @holmesworcester if you need access to the organization.
1. Notify QA that the alpha release is ready for testing.

## Checklist Before Production Release

- [ ] Build is working correctly, passes automated tests and self-QA
- [ ] Alpha was delivered for QA
- [ ] Sprint column is free from QA reported blocking issues
- [ ] QA approved the release
- [ ] All hotfixes for issues discovered in alpha releases have been merged into the release (and develop) branch
- [ ] CHANGELOG.md is up to date and approved by @holmesworcester
- [ ] PM approved the release

## Preparing a Production Release

1. If not already done, generate a [Github Personal Access Token](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens#) and set it as `GH_TOKEN` environment variable (or include it in the command as shown below).
1. Trigger a production release with `GH_TOKEN=<token> npm run publish --release=[patch|minor|major|<EXACT_VERSION>]` (e.g. to create a prerelease of a minor update `npm run publish --release=minor`) This should remove the `alpha.x` suffix, and create a release on the [Releases Page](https://github.com/TryQuiet/quiet/releases), and trigger Github Actions to deploy the release to the Google Play Store and App Store. If the semantic version is different from the alpha release, select no in the prompt to create new versions, and call the command again with the exact version.
1. Manually update the release notes on the [Releases Page](https://github.com/TryQuiet/quiet/releases) with the changes included in the release. See [RELEASE_NOTES_GUIDE.md](RELEASE_NOTES_GUIDE.md) for guidance on writing release notes.
1. Promote the release on the [Google Play Console](https://play.google.com/console/) to a production track.
1. Promote the release on the [App Store Connect](https://appstoreconnect.apple.com/). If the new version has Approved status on the ios console but users see "This beta isn't accepting any new testers right now." please follow those instructions: [Resolving error](https://help.playtestcloud.com/en/articles/6824982-resolving-the-this-beta-isn-t-accepting-any-new-testers-right-now-error).
1. Checkout the `gh-pages` branch, and create a PR ([example](https://github.com/TryQuiet/quiet/pull/2605)) to update the download links on the [Quiet website](https://tryquiet.org/#Downloads) to point to the new release.

## Post-release checklist (production)

- [ ] Release build completed successfully and the assets are uploaded to the release page
- [ ] Download links are updated on website
- [ ] App is promoted and sent for review on a production track in Google Play
- [ ] App is promoted and sent for review on an external track in App Store (Test Flight) **Note:** this is a separate step *after* the builds become visible in TestFlight!! 
- [ ] Issues in `Ready for QA` are moved to `Done`

## QA

QA tests for issues on all the supported platforms, moves discovered blocking issues into the Sprint column, and notifies the team in the Slack **#qa** channel.

QA will test according to the following checklists:
[Quiet Desktop Checklist](https://docs.google.com/spreadsheets/d/1QL5wKFbGMfGK5tZOr0YmeRGk5noS1Beo/edit?usp=sharing&ouid=106345980764925230240&rtpof=true&sd=true)
[Quiet Mobile Checklist](https://docs.google.com/spreadsheets/d/1fwnTQKux7UUJtyjJwm9ENHGvbR_bv5gZ/edit?usp=sharing&ouid=106345980764925230240&rtpof=true&sd=true)
[Quiet Prod Checklist](https://docs.google.com/spreadsheets/d/1qXo6FnED_Js7e-pfVG-ZNrJvztYkRNlK/edit?usp=sharing&ouid=106345980764925230240&rtpof=true&sd=true)

### Rules for QA and Release Approval

1. Team drops any other work to work on new issues blocking release
2. PM can asynchronously decide a bug is not a blocker
3. Team and QA can consult PM if they suspect a bug is not really a blocker despite meeting criteria
4. PM can approve release in advance, pending completion of issues, or wait to give approval
