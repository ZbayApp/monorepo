# Contributing

## Development workflow

> **New to open source?** You can learn how from this _free_ series: [How to Contribute to an Open Source Project on GitHub](https://egghead.io/courses/how-to-contribute-to-an-open-source-project-on-github).

1. Fork the repo and create your branch from `develop` (a guide on [how to fork a repository](https://help.github.com/articles/fork-a-repo/)).
2. See the [desktop](https://github.com/TryQuiet/quiet/blob/develop/packages/desktop/README.md) and [mobile](https://github.com/TryQuiet/quiet/blob/develop/packages/mobile/README.md) README.md to get started.

## Commit message convention

Prefix commit messages with one of the following to signify the kind of change:

- `fix:` bug fixes, e.g. fix incorrect error message.
- `feat:` new features, e.g. add useful API.
- `refactor:` code/structure refactor, e.g. new folder structure.
- `docs:` changes into documentation, e.g. add usage example for getByText.
- `test:` adding or updating tests, eg unit, snapshot testing.
- `chore:` tooling changes, e.g. change circle ci config.
- `BREAKING:` for changes that break existing usage, e.g. change API.

Commit message should be followed by the issue number, eg.
`fix: typo #2002`

### (optional) Setting up a local git hook for verifying message convention:

1. Navigate to git repository in your terminal.
2. Go to the .git/hooks directory:
```
cd .git/hooks
```
3. Create (or edit if it already exists) the commit-msg file
4. Make the file executable:
```
chmod +x commit-msg
```
5. Edit the commit-msg file and paste the following shell script:
```
#!/bin/bash

COMMIT_MSG_FILE=$1
COMMIT_MSG=$(cat $COMMIT_MSG_FILE)

if ! echo "$COMMIT_MSG" | grep -E '^(fix:|feat:|refactor:|docs:|test:|chore:|BREAKING:|Publish)' > /dev/null; then
    echo "error: invalid commit message format"
    echo "Valid formats are fix: feat: refactor: docs: test: chore: BREAKING:"
    exit 1
fi
```
