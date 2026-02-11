# OMAI Android Auto-Updater

This document describes the auto-updater system implemented for the OMAI Android app.

## Overview

The auto-updater system allows the OMAI Android app to check for updates and automatically install new versions. It consists of:

1. A client-side component that checks for updates and prompts the user to install them
2. A server-side component that hosts the APK files and metadata
3. A publishing script that automates the process of uploading new APK versions

## Client-Side Implementation

The client-side implementation is contained in the `UpdateChecker.kt` file in the `utils` package. It uses OkHttp to fetch metadata from the server and compare version numbers. If a new version is available, it shows a dialog prompting the user to update.

### Key Components

- `UpdateChecker.kt`: Utility class that checks for updates and handles the update process
- Integration in `MainActivity.kt`: Calls the update checker when the app starts

### How It Works

1. When the app starts, `MainActivity` calls `UpdateChecker.checkForUpdate(context)` in a coroutine
2. The update checker fetches metadata.json from the server
3. It compares the version in the metadata with the current app version
4. If a newer version is available, it shows a dialog with the changelog
5. If the user clicks "Update Now", it opens the APK URL in a browser or download manager
6. The Android system handles the installation process

## Server-Side Setup

The server-side component is a simple file hosting setup on orthodmetrics.com.

### Directory Structure

```
/var/www/orthodmetrics/dev/omai-apk/
├── metadata.json
└── omai-android-x.y.z.apk
```

### Metadata Format

The metadata.json file contains information about the latest version:

```json
{
  "version": "1.0.0",
  "apk_url": "https://orthodmetrics.com/dev/omai-apk/omai-android-1.0.0.apk",
  "changelog": "Initial release with conversation UI and push-to-talk mic button."
}
```

## Publishing New Versions

A shell script (`publish-apk.sh`) is provided to automate the process of publishing new APK versions.

### Prerequisites

- SSH access to the orthodmetrics.com server
- The APK file to publish

### Usage

```bash
./scripts/publish-apk.sh -v VERSION -c CHANGELOG [-a APK_PATH] [-u SERVER_USER] [-h SERVER_HOST] [-p REMOTE_PATH]
```

#### Options

- `-v VERSION`: Version number for the APK (required)
- `-c CHANGELOG`: Changelog for this version (required)
- `-a APK_PATH`: Path to the APK file (default: app/build/outputs/apk/release/app-release.apk)
- `-u SERVER_USER`: Username for the server (default: user)
- `-h SERVER_HOST`: Hostname for the server (default: orthodmetrics.com)
- `-p REMOTE_PATH`: Remote path on the server (default: /var/www/orthodmetrics/dev/omai-apk)

#### Example

```bash
./scripts/publish-apk.sh -v 1.0.1 -c "Fixed bugs and improved performance" -u admin
```

This will:
1. Create a metadata.json file with version 1.0.1
2. Upload the APK as omai-android-1.0.1.apk
3. Upload the metadata.json file
4. Print the URL of the published APK

### Automating with CI/CD

The publishing script can be integrated into a CI/CD pipeline for automated deployments. For example, with GitHub Actions:

```yaml
name: Publish APK

on:
  release:
    types: [published]

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Set up JDK
        uses: actions/setup-java@v2
        with:
          java-version: '11'
          distribution: 'adopt'
      - name: Build with Gradle
        run: ./gradlew assembleRelease
      - name: Set up SSH
        uses: webfactory/ssh-agent@v0.5.3
        with:
          ssh-private-key: ${{ secrets.SSH_PRIVATE_KEY }}
      - name: Publish APK
        run: |
          ./scripts/publish-apk.sh \
            -v ${{ github.event.release.tag_name }} \
            -c "${{ github.event.release.body }}" \
            -u ${{ secrets.SERVER_USER }} \
            -h orthodmetrics.com
```

## Troubleshooting

### Common Issues

1. **Update dialog not showing**: Check if the app can access the internet and if the metadata.json file is accessible.
2. **Version comparison not working**: Ensure version numbers follow the semantic versioning format (x.y.z).
3. **APK installation fails**: Make sure the APK is signed with the correct key and the user has allowed installation from unknown sources.

### Logs

The update checker logs errors to the Android system log. You can view these logs using ADB:

```bash
adb logcat | grep UpdateChecker
```

## Future Improvements

- Add support for delta updates to reduce download size
- Implement background downloading of updates
- Add more detailed update information (release notes, screenshots)
- Add support for different update channels (stable, beta, dev)