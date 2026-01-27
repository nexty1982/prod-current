# OMAI Android Build Setup Guide

This guide addresses the issues encountered when trying to build the OMAI Android application and provides a comprehensive solution for setting up your build environment correctly.

## Issues Addressed

This guide addresses two main issues:

1. **Missing Gradle Wrapper Files**: The error "gradlew.bat not found in project root directory" when running the build script.
2. **Java Configuration**: The error "JAVA_HOME is not set and no 'java' command could be found in your PATH" when running Gradle commands.

## Part 1: Gradle Wrapper Setup

The Gradle Wrapper (gradlew.bat and related files) allows you to run Gradle tasks without having Gradle installed on your system. These files should be included in the project repository, but if they're missing, you can create them manually.

### What We've Done

We've created the following Gradle Wrapper files in your project:

1. `gradlew.bat`: The Windows batch script for running Gradle commands
2. `gradlew`: The Unix shell script for running Gradle commands
3. `gradle/wrapper/gradle-wrapper.jar`: The JAR file containing the Gradle wrapper code
4. `gradle/wrapper/gradle-wrapper.properties`: The properties file specifying the Gradle version (7.6.3)

These files allow the build scripts to run Gradle commands using the wrapper, which will automatically download the specified Gradle version if needed.

### How to Verify

To verify that the Gradle Wrapper files are properly set up:

1. Check that the following files exist in your project:
   - `gradlew.bat` in the project root
   - `gradlew` in the project root
   - `gradle/wrapper/gradle-wrapper.jar`
   - `gradle/wrapper/gradle-wrapper.properties`

2. Ensure that the `gradle-wrapper.properties` file specifies an appropriate Gradle version (we've set it to 7.6.3, which is compatible with Android projects).

## Part 2: Java Development Kit (JDK) Setup

Even with the Gradle Wrapper files in place, you'll need Java Development Kit (JDK) installed and properly configured to build Android applications. Detailed instructions are provided in the `Java-Setup-Instructions.md` file, but here's a summary:

### Required Steps

1. **Install JDK 11 or higher**:
   - Download from [Oracle JDK](https://www.oracle.com/java/technologies/javase-downloads.html) or [OpenJDK](https://adoptium.net/)
   - Run the installer and note the installation directory

2. **Set JAVA_HOME Environment Variable**:
   - Set to your JDK installation directory (e.g., `C:\Program Files\Java\jdk-11.0.12`)

3. **Add Java to PATH**:
   - Add `%JAVA_HOME%\bin` to your system PATH

4. **Verify Java Installation**:
   - Open a new PowerShell window
   - Run `java -version` to confirm Java is properly installed

## Part 3: Android SDK Setup

In addition to JDK, you'll need the Android SDK and related tools. The easiest way to get these is by installing Android Studio.

### Required Components

1. **Android SDK**: The core SDK files
2. **Android SDK Build Tools**: Required for building APKs
3. **Android SDK Platform Tools**: Required for interacting with Android devices
4. **Android SDK Platform**: At least one platform version (e.g., Android 14)

### Setting Up Android SDK

1. **Install Android Studio**:
   - Download from [developer.android.com](https://developer.android.com/studio)
   - Run the installer and follow the instructions
   - During installation, ensure that "Android SDK" is selected

2. **Set ANDROID_HOME Environment Variable**:
   - Set to your Android SDK installation directory (typically `C:\Users\<username>\AppData\Local\Android\Sdk`)

3. **Add Android Tools to PATH**:
   - Add the following to your system PATH:
     - `%ANDROID_HOME%\tools`
     - `%ANDROID_HOME%\tools\bin`
     - `%ANDROID_HOME%\platform-tools`

## Building the OMAI Android Application

Once you have set up the Gradle Wrapper, JDK, and Android SDK, you should be able to build the OMAI Android application:

1. Open a new PowerShell window (to ensure it has the updated environment variables)
2. Navigate to the OMAI project directory:
   ```
   cd C:\Users\npars\OneDrive\Documents\OMAI
   ```
3. Run the build script:
   ```
   .\scripts\build-debug-apk.ps1
   ```

If everything is set up correctly, the script should:
- Clean the project
- Build the debug APK
- Copy the APK to the project root as `latest-debug.apk`

## Preventing Future Issues

To prevent similar issues in the future:

1. **Include Gradle Wrapper in Version Control**:
   - Always commit the Gradle Wrapper files to your version control system
   - This includes `gradlew.bat`, `gradlew`, and the `gradle/wrapper` directory

2. **Document Environment Requirements**:
   - Clearly document the required JDK version
   - Include instructions for setting up environment variables
   - List all required Android SDK components

3. **Use CI/CD Pipelines**:
   - Set up continuous integration to catch build issues early
   - Include environment setup in your CI/CD configuration

4. **Create a Project README**:
   - Include setup instructions in your project README
   - Link to more detailed documentation as needed

## Troubleshooting

If you encounter issues:

1. **Verify Environment Variables**:
   - `echo $env:JAVA_HOME` should show your JDK path
   - `echo $env:ANDROID_HOME` should show your Android SDK path

2. **Check Tool Versions**:
   - `java -version` should show JDK 11 or higher
   - `.\gradlew.bat --version` should show Gradle 7.6.3 or compatible version

3. **Look for Specific Error Messages**:
   - Gradle errors often provide detailed information about what's wrong
   - Android build errors typically indicate missing components or configuration issues

4. **Consult the Logs**:
   - Check the Gradle build logs for detailed error information
   - Logs are typically in the `build/reports` directory

## Support

If you continue to experience issues, please contact the OMAI support team at support@orthodoxmetrics.com or through your church administrator.