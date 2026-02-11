# OMAI APK Generation Instructions

This guide explains how to generate the APK files needed to install the OMAI application on your Samsung Galaxy Z Fold 6 or other Android devices.

## Prerequisites

Before generating the APK files, ensure you have the following:

1. Windows computer with PowerShell
2. Java Development Kit (JDK) installed (version 11 or higher recommended)
3. Android SDK installed (typically comes with Android Studio)
4. Git installed (to clone the repository if you haven't already)
5. The OMAI project code on your computer

## Generating the Debug APK

The debug APK (`latest-debug.apk`) is the easiest to generate and is suitable for testing purposes.

### Steps to Generate Debug APK:

1. Open PowerShell on your Windows computer
2. Navigate to the OMAI project root directory:
   ```
   cd C:\Users\npars\OneDrive\Documents\OMAI
   ```
3. Run the debug build script:
   ```
   .\scripts\build-debug-apk.ps1
   ```
4. Wait for the build process to complete. This may take a few minutes depending on your computer's performance.
5. Once completed, you should see a success message indicating that the APK was created.

### Where to Find the Debug APK:

After successful generation, the debug APK will be located at:
```
C:\Users\npars\OneDrive\Documents\OMAI\latest-debug.apk
```

This is the file you need to transfer to your Galaxy Z Fold 6 for installation.

## Generating the Release APK (Advanced)

The release APK (`omai-release.apk`) is used for production releases and requires a signing keystore. This is typically only needed by developers or for official distribution.

### Steps to Generate Release APK:

1. Open PowerShell on your Windows computer
2. Navigate to the OMAI project root directory:
   ```
   cd C:\Users\npars\OneDrive\Documents\OMAI
   ```
3. Ensure you have a keystore file for signing the APK. If you don't have one, you can create it using:
   ```
   keytool -genkey -v -keystore keystore\release.keystore -alias release -keyalg RSA -keysize 2048 -validity 10000
   ```
4. Run the release build script:
   ```
   .\scripts\build-release.ps1 [keystore_path] [keystore_password] [key_alias] [key_password]
   ```
   Replace the parameters with your keystore information, or omit them to use the defaults.
5. Wait for the build process to complete.
6. Once completed, you should see a success message indicating that the APK was created.

### Where to Find the Release APK:

After successful generation, the release APK will be located at:
```
C:\Users\npars\OneDrive\Documents\OMAI\OMAI\releases\omai-release.apk
```

## Transferring the APK to Your Galaxy Z Fold 6

Once you have generated the APK file, you need to transfer it to your Galaxy Z Fold 6 for installation:

1. Connect your Galaxy Z Fold 6 to your computer using a USB cable
2. Select "File Transfer" mode on your phone when prompted
3. Copy the APK file (either `latest-debug.apk` or `omai-release.apk`) to your device's storage
4. Follow the installation instructions in the OMAI-Galaxy-Z-Fold-6-Installation-Guide.md file

## Alternative Installation Methods

If you're unable to generate the APK files using the build scripts, consider these alternative installation methods:

1. **Firebase App Distribution**: If you've been invited as a tester, you can install the app through Firebase App Distribution without needing to manually generate the APK.

2. **Google Play Store Internal Test Track**: If you've been invited to the internal test track, you can install the app directly from the Google Play Store.

Both of these methods are explained in detail in the OMAI-Galaxy-Z-Fold-6-Installation-Guide.md file.

## Troubleshooting

If you encounter issues during the APK generation process:

1. **Missing gradlew.bat**: Ensure you're in the correct project directory and that the project has been properly initialized.

2. **Java/Android SDK issues**: Make sure your JAVA_HOME and ANDROID_HOME environment variables are correctly set.

3. **Build failures**: Check the error messages in the console output for specific issues. Common problems include missing dependencies or configuration issues.

4. **Permission issues**: Make sure you're running PowerShell with appropriate permissions.

For additional assistance, please contact the OMAI support team at support@orthodoxmetrics.com or through your church administrator.