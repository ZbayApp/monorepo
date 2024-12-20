
#import "RNNodeJsMobile.h"
#import "NodeRunner.hpp"
#import <React/RCTEventDispatcher.h>


@implementation RNNodeJsMobile

NSString* const EVENTS_CHANNEL = @"_EVENTS_";

NSString* const BUILTIN_MODULES_RESOURCE_PATH = @"builtin_modules";
NSString* const NODEJS_PROJECT_RESOURCE_PATH = @"nodejs-project";
NSString* const NODEJS_DLOPEN_OVERRIDE_FILENAME = @"override-dlopen-paths-preload.js";
NSString* nodePath;

@synthesize bridge = _bridge;

- (dispatch_queue_t)methodQueue
{
    return dispatch_get_main_queue();
}

+ (BOOL)requiresMainQueueSetup
{
    return YES;
}

- (id)init
{
  self = [super init];
  if (self != nil)
  {
    [[NodeRunner sharedInstance] setCurrentRNNodeJsMobile:self];
  }

  NSString* builtinModulesPath = [[NSBundle mainBundle] pathForResource:BUILTIN_MODULES_RESOURCE_PATH ofType:@""];
  nodePath = [[NSBundle mainBundle] pathForResource:NODEJS_PROJECT_RESOURCE_PATH ofType:@""];
  nodePath = [nodePath stringByAppendingString:@":"];
  nodePath = [nodePath stringByAppendingString:builtinModulesPath];
  
  return self;
}

RCT_EXPORT_MODULE()

-(void)callStartNodeProject:(NSString *)input
{
  NSArray* command = [input componentsSeparatedByString: @" "];
  NSString* script = [command objectAtIndex:0];

  NSMutableArray* args = [command mutableCopy];
  [args removeObject:[args objectAtIndex:0]];

  NSString* srcPath = [[NSBundle mainBundle] pathForResource:[NSString stringWithFormat:@"%@/%@", NODEJS_PROJECT_RESOURCE_PATH, script] ofType:@""];

  NSMutableArray* nodeArguments = nil;

  NSString* dlopenoverridePath = [[NSBundle mainBundle] pathForResource:[NSString stringWithFormat:@"%@/%@", NODEJS_PROJECT_RESOURCE_PATH, NODEJS_DLOPEN_OVERRIDE_FILENAME] ofType:@""];
  
  // Check if the file to override dlopen lookup exists, for loading native modules from the Frameworks.
  if(!dlopenoverridePath)
  {
    nodeArguments = [NSMutableArray arrayWithObjects:
                              @"node",
                              @"--experimental-global-customevent",
                              srcPath,
                              nil
                    ];

    [nodeArguments addObjectsFromArray:args];
  } else {
    nodeArguments = [NSMutableArray arrayWithObjects:
                              @"node",
                              @"--experimental-global-customevent",
                              @"-r",
                              dlopenoverridePath,
                              srcPath,
                              nil
                    ];

    [nodeArguments addObjectsFromArray:args];
  }
  [[NodeRunner sharedInstance] startEngineWithArguments:nodeArguments:nodePath];
}

RCT_EXPORT_METHOD(startNodeProject:(NSString *)command options:(NSDictionary *)options)
{
  if(![NodeRunner sharedInstance].startedNodeAlready)
  {
    [NodeRunner sharedInstance].startedNodeAlready=true;
    NSThread* nodejsThread = nil;
    nodejsThread = [[NSThread alloc]
      initWithTarget:self
      selector:@selector(callStartNodeProject:)
      object:command
    ];
    // Set 2MB of stack space for the Node.js thread.
    [nodejsThread setStackSize:2*1024*1024];
    [nodejsThread start];
  }
}

-(void)sendMessageToNode:(NSString *)event:(NSString *)message
{
  NSString * data = [NSString stringWithFormat:@"{ \"event\": \"%@\", \"payload\": \"%@\" }", event, message];
  dispatch_async(dispatch_get_global_queue(DISPATCH_QUEUE_PRIORITY_BACKGROUND, 0), ^{
    [[NodeRunner sharedInstance] sendMessageToNode:EVENTS_CHANNEL:data];
  });
}

-(void) sendMessageBackToReact:(NSString*)channelName:(NSString*)message
{
  dispatch_async(dispatch_get_global_queue(DISPATCH_QUEUE_PRIORITY_BACKGROUND, 0), ^{
    [self.bridge.eventDispatcher sendAppEventWithName:@"nodejs-mobile-react-native-message"
      body:@{@"channelName": channelName, @"message": message}
    ];
  });
}

@end

