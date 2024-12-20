#include <jni.h>
#include <string>
#include <cstdlib>
#include <pthread.h>
#include <unistd.h>
#include <android/log.h>

#include "node.h"
#include "rn-bridge.h"

// cache the environment variable for the thread running node to call into java
JNIEnv *cacheEnvPointer = NULL;

extern "C" JNIEXPORT void JNICALL
Java_com_quietmobile_Backend_BackendWorker_sendMessageToNodeChannel(
    JNIEnv *env,
    jobject /* this */,
    jstring channelName,
    jstring message)
{
    const char *nativeChannelName = env->GetStringUTFChars(channelName, 0);
    const char *nativeMessage = env->GetStringUTFChars(message, 0);
    rn_bridge_notify(nativeChannelName, nativeMessage);
    env->ReleaseStringUTFChars(channelName, nativeChannelName);
    env->ReleaseStringUTFChars(message, nativeMessage);
}

extern "C" int callIntoNode(int argc, char *argv[])
{
    const int exit_code = node::Start(argc, argv);
    return exit_code;
}

#if defined(__arm__)
#define CURRENT_ABI_NAME "armeabi-v7a"
#elif defined(__aarch64__)
#define CURRENT_ABI_NAME "arm64-v8a"
#elif defined(__i386__)
#define CURRENT_ABI_NAME "x86"
#elif defined(__x86_64__)
#define CURRENT_ABI_NAME "x86_64"
#else
#error "Trying to compile for an unknown ABI."
#endif

extern "C" JNIEXPORT jstring JNICALL
Java_com_quietmobile_Backend_NodeProjectManager_getCurrentABIName(
    JNIEnv *env,
    jobject /* this */)
{
    return env->NewStringUTF(CURRENT_ABI_NAME);
}

extern "C" JNIEXPORT void JNICALL
Java_com_quietmobile_Backend_BackendWorker_registerNodeDataDirPath(
    JNIEnv *env,
    jobject /* this */,
    jstring dataDir)
{
    const char *nativeDataDir = env->GetStringUTFChars(dataDir, 0);
    env->ReleaseStringUTFChars(dataDir, nativeDataDir);
}

void rcv_message(const char* channel_name, const char* msg) {
  JNIEnv *env=cacheEnvPointer;
  if(!env) return;
  jclass cls2 = env->FindClass("com/quietmobile/BackendWorker");
  if(cls2 != nullptr) {
    jmethodID m_sendMessage = env->GetStaticMethodID(cls2, "handleNodeMessages", "(Ljava/lang/String;Ljava/lang/String;)V");
    if(m_sendMessage != nullptr) {
        jstring java_channel_name=env->NewStringUTF(channel_name);
        jstring java_msg=env->NewStringUTF(msg);
        env->CallStaticVoidMethod(cls2, m_sendMessage, java_channel_name, java_msg);
        env->DeleteLocalRef(java_channel_name);
        env->DeleteLocalRef(java_msg);
    }
  }
  env->DeleteLocalRef(cls2);
}

// Start threads to redirect stdout and stderr to logcat.
int pipe_stdout[2];
int pipe_stderr[2];
pthread_t thread_stdout;
pthread_t thread_stderr;
const char *ADBTAG = "NODEJS-MOBILE";

void *thread_stderr_func(void *)
{
    ssize_t redirect_size;
    char buf[2048];
    while ((redirect_size = read(pipe_stderr[0], buf, sizeof buf - 1)) > 0)
    {
        //__android_log will add a new line anyway.
        if (buf[redirect_size - 1] == '\n')
            --redirect_size;
        buf[redirect_size] = 0;
        __android_log_write(ANDROID_LOG_ERROR, ADBTAG, buf);
    }
    return 0;
}

void *thread_stdout_func(void *)
{
    ssize_t redirect_size;
    char buf[2048];
    while ((redirect_size = read(pipe_stdout[0], buf, sizeof buf - 1)) > 0)
    {
        //__android_log will add a new line anyway.
        if (buf[redirect_size - 1] == '\n')
            --redirect_size;
        buf[redirect_size] = 0;
        __android_log_write(ANDROID_LOG_INFO, ADBTAG, buf);
    }
    return 0;
}

int start_redirecting_stdout_stderr()
{
    // set stdout as unbuffered.
    setvbuf(stdout, 0, _IONBF, 0);
    pipe(pipe_stdout);
    dup2(pipe_stdout[1], STDOUT_FILENO);

    // set stderr as unbuffered.
    setvbuf(stderr, 0, _IONBF, 0);
    pipe(pipe_stderr);
    dup2(pipe_stderr[1], STDERR_FILENO);

    if (pthread_create(&thread_stdout, 0, thread_stdout_func, 0) == -1)
        return -1;
    pthread_detach(thread_stdout);

    if (pthread_create(&thread_stderr, 0, thread_stderr_func, 0) == -1)
        return -1;
    pthread_detach(thread_stderr);

    return 0;
}

// node's libUV requires all arguments being on contiguous memory.
extern "C" jobject JNICALL
Java_com_quietmobile_Backend_BackendWorker_startNodeWithArguments(
    JNIEnv *env,
    jobject /* this */,
    jobjectArray arguments,
    jstring modulesPath)
{

    // Set the builtin_modules path to NODE_PATH.
    const char *path_path = env->GetStringUTFChars(modulesPath, 0);
    setenv("NODE_PATH", path_path, 1);
    setenv("DEBUG", "backend*,quiet*,state-manager*,desktop*,utils*,identity*,common*,libp2p:connection-manager:auto-dial", 1);
    env->ReleaseStringUTFChars(modulesPath, path_path);

    // argc
    jsize argument_count = env->GetArrayLength(arguments);

    // Compute byte size need for all arguments in contiguous memory.
    int c_arguments_size = 0;
    for (int i = 0; i < argument_count; i++)
    {
        c_arguments_size += strlen(env->GetStringUTFChars((jstring)env->GetObjectArrayElement(arguments, i), 0));
        c_arguments_size++; // for '\0'
    }

    // Stores arguments in contiguous memory.
    char *args_buffer = (char *)calloc(c_arguments_size, sizeof(char));

    // argv to pass into node.
    char *argv[argument_count];

    // To iterate through the expected start position of each argument in args_buffer.
    char *current_args_position = args_buffer;

    // Populate the args_buffer and argv.
    for (int i = 0; i < argument_count; i++)
    {
        const char *current_argument = env->GetStringUTFChars((jstring)env->GetObjectArrayElement(arguments, i), 0);

        // Copy current argument to its expected position in args_buffer
        strncpy(current_args_position, current_argument, strlen(current_argument));

        // Save current argument start position in argv
        argv[i] = current_args_position;

        // Increment to the next argument's expected position.
        current_args_position += strlen(current_args_position) + 1;
    }

    rn_register_bridge_cb(&rcv_message);

    cacheEnvPointer = env;

    // Start threads to show stdout and stderr in logcat.
    if (start_redirecting_stdout_stderr() == -1)
    {
        __android_log_write(ANDROID_LOG_ERROR, ADBTAG, "Couldn't start redirecting stdout and stderr to logcat.");
    }

    // Start node, with argc and argv.
    callIntoNode(argument_count, argv);

    return nullptr;
}
