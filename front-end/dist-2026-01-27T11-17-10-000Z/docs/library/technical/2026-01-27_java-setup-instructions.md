# Java Setup Instructions for OMAI Android Build

This document provides instructions for setting up Java Development Kit (JDK), which is required for building the OMAI Android application.

## Issue Background

When attempting to build the OMAI Android application using the `build-debug-apk.ps1` script, you may encounter the following error:

```
ERROR: JAVA_HOME is not set and no 'java' command could be found in your PATH.
Please set the JAVA_HOME variable in your environment to match the
location of your Java installation.
```

This error occurs because the Android build process requires Java Development Kit (JDK) to be installed and properly configured on your system.

## Step 1: Install Java Development Kit (JDK)

1. Download JDK 11 or higher from one of these sources:
   - [Oracle JDK](https://www.oracle.com/java/technologies/javase-downloads.html)
   - [OpenJDK](https://adoptium.net/) (recommended)

2. Run the installer and follow the installation instructions.
   - Note the installation directory (e.g., `C:\Program Files\Java\jdk-11.0.12`).
   - Complete the installation process.

## Step 2: Set JAVA_HOME Environment Variable

1. Open the Start menu and search for "Environment Variables" or "Edit the system environment variables".
2. Click on "Environment Variables" in the System Properties dialog.
3. In the "System variables" section, click "New".
4. Set the variable name to `JAVA_HOME`.
5. Set the variable value to your JDK installation directory (e.g., `C:\Program Files\Java\jdk-11.0.12`).
6. Click "OK" to save the new variable.

## Step 3: Add Java to PATH

1. In the same Environment Variables dialog, find the "Path" variable in the "System variables" section.
2. Select it and click "Edit".
3. Click "New" and add `%JAVA_HOME%\bin`.
4. Click "OK" to save the changes.
5. Click "OK" again to close the Environment Variables dialog.
6. Click "OK" to close the System Properties dialog.

## Step 4: Verify Java Installation

1. Open a new PowerShell window (important: existing windows won't have the updated environment variables).
2. Run the following command to verify that Java is properly installed:
   ```
   java -version
   ```
3. You should see output similar to:
   ```
   openjdk version "11.0.12" 2021-07-20
   OpenJDK Runtime Environment Temurin-11.0.12+7 (build 11.0.12+7)
   OpenJDK 64-Bit Server VM Temurin-11.0.12+7 (build 11.0.12+7, mixed mode)
   ```

## Step 5: Try Building the APK Again

1. Open a new PowerShell window.
2. Navigate to the OMAI project directory:
   ```
   cd C:\Users\npars\OneDrive\Documents\OMAI
   ```
3. Run the build script:
   ```
   .\scripts\build-debug-apk.ps1
   ```

## Troubleshooting

If you still encounter issues:

1. **Verify JAVA_HOME**: Run `echo $env:JAVA_HOME` in PowerShell to verify that the environment variable is set correctly.

2. **Verify Java in PATH**: Run `where java` in PowerShell to verify that Java is in your PATH.

3. **Check JDK Version**: Ensure you have installed JDK 11 or higher, as required for Android development.

4. **Restart Your Computer**: Sometimes a full restart is needed for environment variable changes to take effect.

5. **Check for Spaces in Paths**: If your JDK is installed in a path with spaces, ensure the path is properly quoted in environment variables.

## Additional Requirements

In addition to Java, Android development requires:

1. **Android SDK**: Typically installed with Android Studio.
2. **Android SDK Build Tools**: Required for building Android applications.
3. **Android SDK Platform Tools**: Required for interacting with Android devices.

If you don't have these installed, consider installing Android Studio, which includes all necessary components for Android development.

## Support

If you continue to experience issues, please contact the OMAI support team at support@orthodoxmetrics.com or through your church administrator.