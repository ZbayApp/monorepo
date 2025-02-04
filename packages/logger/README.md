# Quiet Logger

## Creating a logger for a package

```
import { createQuietLogger } from '@quiet/logger'

export const createLogger = createQuietLogger('backend')
```

This creates the base logger that all modules will extend from.

## Creating a logger for a module

Once a package logger (see above) has been created you can call `createLogger` to create a module-level logger in a file like

```
private readonly logger = createLogger(IpfsFileManagerService.name)
```

This would produce log messages with the scope `backend:IpfsFileManagerService`.

## Setting log levels

The maximum level at which we log is set by the `DEBUG` environment variable.  For local desktop this can set on the `start` npm script and for the backend, run from the desktop, it can be set in `src/main/main.ts`.

**NOTE: Any logs emitted by the backend when run as part of Quiet (i.e. not running the backend standalone) _must_ have their log level set via `src/main/main.ts`.  The environment variable on the desktop start script does not propagate!**

### Levels Explained

There are currently 3 levels that logging can be set at for Quiet logs:

1. On
2. Debug
3. Trace

#### On

Excluding a package or module from `DEBUG` will still print logs from the Quiet logger but will exclude `log`, `debug` and `trace` logs for that package/module.

#### Debug

Including a package or module in `DEBUG` will print the same logs as `On` but will now include `log` and `debug` logs for that package/module.

#### Trace

Including a package or module in `DEBUG` with the suffix `:trace` print all logs for that package/module.

### How to Set the Log Level

#### Set the log level of the backend package to DEBUG

```
DEBUG='backend*'
```

#### Set the log level of the just the logger named backend:ConnectionsManagerService to DEBUG

```
DEBUG='backend:ConnectionsManagerService'
```

#### Set the log level of the backend package to Trace

```
DEBUG='backend*:trace'
```

#### Set the log level of the just the logger named backend:ConnectionsManagerService to Trace

```
DEBUG='backend:ConnectionsManagerService:trace'
```

## Setting log levels for dependencies

Many dependencies (e.g. `libp2p`) also follow the `debug` package's scheme for determining log level and can be set similarly to the Quiet logger.  The main exception is that excluding a package or module from `DEBUG` will hide _all_ logs for that package/module.

### Exclude all libp2p logs

```
DEBUG='quiet*,state-manager*,desktop*,utils*,identity*,common*,backend*'
```

### Print all libp2p logs except trace

```
DEBUG='quiet*,state-manager*,desktop*,utils*,identity*,common*,backend*,libp2p*'
```

### Print all libp2p logs

```
DEBUG='quiet*,state-manager*,desktop*,utils*,identity*,common*,backend*,libp2p*:trace'
```