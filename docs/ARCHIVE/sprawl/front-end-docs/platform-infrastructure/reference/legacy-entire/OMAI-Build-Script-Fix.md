# OMAI Build Script Fix

## Issue Description

When running the `build-debug-apk.ps1` script, the following errors were encountered:

```
FAILURE: Build failed with an exception.

* What went wrong:
Task 'assembleDebug' not found in root project 'OMAI'.

FAILURE: Build failed with an exception.

* What went wrong:
Task 'copyDebugApk' not found in root project 'OMAI'.
```

## Root Cause Analysis

The issue was that the build script was trying to run Gradle tasks directly from the project root directory, but these tasks were defined in the app module, not at the root level.

In the Android project structure:
- The `assembleDebug` task is defined in the app module
- The `copyDebugApk` task is a custom task defined in the app module's build.gradle file (lines 72-78)

When running Gradle tasks that are defined in a specific module, you need to specify the module name as a prefix to the task name.

## Solution

The build script (`scripts/build-debug-apk.ps1`) was modified to correctly specify the module name when running Gradle tasks:

1. Changed `.\gradlew.bat assembleDebug` to `.\gradlew.bat app:assembleDebug`
2. Changed `.\gradlew.bat copyDebugApk` to `.\gradlew.bat app:copyDebugApk`

These changes tell Gradle to look for these tasks in the 'app' module rather than at the root level.

## Additional Notes

When attempting to test the modified script, a Java environment setup issue was encountered:

```
ERROR: JAVA_HOME is not set and no 'java' command could be found in your PATH.
Please set the JAVA_HOME variable in your environment to match the
location of your Java installation.
```

This is a separate issue related to the Java development environment setup and is documented in the project's `Java-Setup-Instructions.md` file. Once the Java environment is properly set up, the modified build script should work correctly.

## How to Test

After setting up the Java environment as described in `Java-Setup-Instructions.md`:

1. Open a PowerShell window
2. Navigate to the OMAI project directory
3. Run the build script: `.\scripts\build-debug-apk.ps1`
4. Verify that the debug APK is generated at the project root as `latest-debug.apk`