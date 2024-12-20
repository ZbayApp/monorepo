#import <UIKit/UIKit.h>
#include "NodeRunner.hpp"
#include <NodeMobile/NodeMobile.h>
#include <string>
#include "rn-bridge.h"


@implementation NodeRunner
{
  RNNodeJsMobile * _currentModuleInstance;
}

@synthesize startedNodeAlready = _startedNodeAlready;

NSString* const SYSTEM_CHANNEL = @"_SYSTEM_";

void rcv_message(const char* channelName, const char* msg) {
  @autoreleasepool {
    NSString* objectiveCChannelName=[NSString stringWithUTF8String:channelName];
    NSString* objectiveCMessage=[NSString stringWithUTF8String:msg];

    if ([objectiveCChannelName isEqualToString:SYSTEM_CHANNEL]) {
      // If it's a system channel call, handle it in the plugin native side.
      handleAppChannelMessage(objectiveCMessage);
    } else {
      // Otherwise, send it to React Native.
    [[NodeRunner sharedInstance] sendMessageBackToReact:objectiveCChannelName:objectiveCMessage];
    }
  }
}

+ (NodeRunner*)sharedInstance {
  static NodeRunner *_instance = nil;
  @synchronized(self) {
    if (_instance == nil)
      _instance = [[self alloc] init];
  }
  return _instance;
}
- (id)init {
  if (self = [super init]) {
    _currentModuleInstance=nil;
    _startedNodeAlready=false;
  }
  [[NSNotificationCenter defaultCenter] addObserver:self
                                        selector:@selector(onPause)
                                        name:UIApplicationDidEnterBackgroundNotification object:nil];

  [[NSNotificationCenter defaultCenter] addObserver:self
                                        selector:@selector(onResume)
                                        name:UIApplicationWillEnterForegroundNotification object:nil];
  // Register the Documents Directory as the node dataDir.
  NSString* nodeDataDir = [NSSearchPathForDirectoriesInDomains(NSDocumentDirectory, NSUserDomainMask, YES) firstObject];
  rn_register_node_data_dir_path([nodeDataDir UTF8String]);
  return self;
}

- (void)dealloc {
}

void handleAppChannelMessage(NSString* msg) {
  if([msg hasPrefix:@"release-pause-event"]) {
    // The nodejs runtime has signaled it has finished handling a pause event.
    NSArray *eventArguments = [msg componentsSeparatedByString:@"|"];
    // The expected format for this message is "release-pause-event|{eventId}"
    if (eventArguments.count >=2) {
      // Release the received eventId.
      [[NodeRunner sharedInstance] ReleasePauseEvent:eventArguments[1]];
    }
  } else if ([msg isEqualToString:@"ready-for-app-events"]) {
    // The nodejs runtime is ready for APP events.
    nodeIsReadyForAppEvents = true;
  }
}

// Flag to indicate if node is ready to receive app events.
bool nodeIsReadyForAppEvents = false;

// Condition to wait on pause event handling on the node side.
NSCondition *appEventBeingProcessedCondition = [[NSCondition alloc] init];

// Set to keep ids for called pause events, so they can be unlocked later.
NSMutableSet* appPauseEventsManagerSet = [[NSMutableSet alloc] init];

// Lock to manipulate the App Pause Events Manager Set.
id appPauseEventsManagerSetLock = [[NSObject alloc] init];

/**
 * Handlers for events registered by the plugin:
 * - onPause
 * - onResume
 */

- (void) onPause {
  if(nodeIsReadyForAppEvents) {
    UIApplication *application = [UIApplication sharedApplication];
    // Inform the app intends do run something in the background.
    // In this case we'll try to wait for the pause event to be properly taken care of by node.
    __block UIBackgroundTaskIdentifier backgroundWaitForPauseHandlerTask =
      [application beginBackgroundTaskWithExpirationHandler: ^ {
        // Expiration handler to avoid app crashes if the task doesn't end in the iOS allowed background duration time.
        [application endBackgroundTask: backgroundWaitForPauseHandlerTask];
        backgroundWaitForPauseHandlerTask = UIBackgroundTaskInvalid;
      }];

    NSTimeInterval intendedMaxDuration = [application backgroundTimeRemaining]+1;
    // Calls the event in a background thread, to let this UIApplicationDidEnterBackgroundNotification
    // return as soon as possible.
    dispatch_async(dispatch_get_global_queue(DISPATCH_QUEUE_PRIORITY_DEFAULT, 0), ^{
      NSDate * targetMaximumFinishTime = [[NSDate date] dateByAddingTimeInterval:intendedMaxDuration];
      // We should block the thread at most until a bit (1 second) after the maximum allowed background time.
      // The background task will be ended by the expiration handler, anyway.
      // SendPauseEventAndWaitForRelease won't return until the node runtime notifies it has finished its pause event (or the target time is reached).
      [self SendPauseEventAndWaitForRelease:targetMaximumFinishTime];
      // After SendPauseEventToNodeChannel returns, clean up the background task and let the Application enter the suspended state.
      [application endBackgroundTask: backgroundWaitForPauseHandlerTask];
      backgroundWaitForPauseHandlerTask = UIBackgroundTaskInvalid;
    });
  }
}

- (void) onResume {
  if(nodeIsReadyForAppEvents) {
    [[NodeRunner sharedInstance] sendMessageToNode:SYSTEM_CHANNEL:@"resume"];
  }
}

// Sends the pause event to the node runtime and returns only after node signals
// the event has been handled explicitely or the background time is running out.
- (void) SendPauseEventAndWaitForRelease:(NSDate*)expectedFinishTime {
  // Get unique identifier for this pause event.
  NSString * eventId = [[NSUUID UUID] UUIDString];
  // Create the pause event message with the id.
  NSString * event = [NSString stringWithFormat:@"pause|%@", eventId];

  [appEventBeingProcessedCondition lock];

  @synchronized(appPauseEventsManagerSetLock) {
    [appPauseEventsManagerSet addObject:eventId];
  }

  [[NodeRunner sharedInstance] sendMessageToNode:SYSTEM_CHANNEL:event];

  while (YES) {
    // Looping to avoid unintended spurious wake ups.
    @synchronized(appPauseEventsManagerSetLock) {
      if(![appPauseEventsManagerSet containsObject:eventId]) {
        // The Id for this event has been released.
        break;
      }
    }
    if([expectedFinishTime timeIntervalSinceNow] <= 0) {
      // We blocked the background thread long enough.
      break;
    }
    [appEventBeingProcessedCondition waitUntilDate:expectedFinishTime];
  }
  [appEventBeingProcessedCondition unlock];

  @synchronized(appPauseEventsManagerSetLock) {
    [appPauseEventsManagerSet removeObject:eventId];
  }
}

// Signals the pause event has been handled by the node side.
- (void) ReleasePauseEvent:(NSString*)eventId {
  [appEventBeingProcessedCondition lock];
  @synchronized(appPauseEventsManagerSetLock) {
    [appPauseEventsManagerSet removeObject:eventId];
  }
  [appEventBeingProcessedCondition broadcast];
  [appEventBeingProcessedCondition unlock];
}


- (void) setCurrentRNNodeJsMobile:(RNNodeJsMobile*)module
{
  _currentModuleInstance=module;
}

-(void) sendMessageToNode:(NSString*)channelName:(NSString*)message
{
  const char* c_channelName=[channelName UTF8String];
  const char* c_message=[message UTF8String];
  rn_bridge_notify(c_channelName, c_message);
}

-(void) sendMessageBackToReact:(NSString*)channelName:(NSString*)message
{
  if(_currentModuleInstance!=nil) {
    [_currentModuleInstance sendMessageBackToReact:channelName:message];
  }
}

//node's libUV requires all arguments being on contiguous memory.
- (void) startEngineWithArguments:(NSArray*)arguments:(NSString*)builtinModulesPath
{
  //Set the builtin_modules path to NODE_PATH
  NSString* nodePath = [[NSProcessInfo processInfo] environment][@"NODE_PATH"];
  if (nodePath == NULL)
  {
    nodePath = builtinModulesPath;
  } else {
    nodePath = [nodePath stringByAppendingString:@":"];
    nodePath = [nodePath stringByAppendingString:builtinModulesPath];
  }
  setenv([@"NODE_PATH" UTF8String], (const char*)[nodePath UTF8String], 1);
  setenv([@"DEBUG" UTF8String], "backend*,quiet*,state-manager*,desktop*,utils*,identity*,common*,libp2p*,helia*,blockstore*,datastore*", 1);

  int c_arguments_size=0;

  //Compute byte size need for all arguments in contiguous memory.
  for (id argElement in arguments)
  {
    c_arguments_size+=strlen([argElement UTF8String]);
    c_arguments_size++; // for '\0'
  }

  //Stores arguments in contiguous memory.
  char* args_buffer=(char*)calloc(c_arguments_size, sizeof(char));

  //argv to pass into node.
  char* argv[[arguments count]];

  //To iterate through the expected start position of each argument in args_buffer.
  char* current_args_position=args_buffer;

  //Argc
  int argument_count=0;

  //Populate the args_buffer and argv.
  for (id argElement in arguments)
  {
    const char* current_argument=[argElement UTF8String];

    //Copy current argument to its expected position in args_buffer
    strncpy(current_args_position, current_argument, strlen(current_argument));

    //Save current argument start position in argv and increment argc.
    argv[argument_count]=current_args_position;
    argument_count++;

    //Increment to the next argument's expected position.
    current_args_position+=strlen(current_args_position)+1;
  }
  rn_register_bridge_cb(rcv_message);
  //Start node, with argc and argv.
  node_start(argument_count, argv);
}
@end



