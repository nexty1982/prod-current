# OMAI Android Auto-Updater Test Plan

This document outlines the test plan for the OMAI Android auto-updater system.

## Test Objectives

1. Verify that the update checker correctly detects when a new version is available
2. Verify that the update dialog is displayed with the correct information
3. Verify that the update installation process works correctly
4. Verify that the publish-apk.sh script correctly uploads APKs and updates metadata

## Test Environment

- Android device or emulator running Android 6.0 or higher
- Server with SSH access for testing the publish script
- Test APK files with different version numbers

## Test Cases

### 1. Version Comparison Tests

| Test ID | Description | Test Steps | Expected Result |
|---------|-------------|------------|-----------------|
| VC-01 | Same version | 1. Set current app version to "1.0.0"<br>2. Set server version to "1.0.0"<br>3. Run update check | No update dialog should be shown |
| VC-02 | Newer major version | 1. Set current app version to "1.0.0"<br>2. Set server version to "2.0.0"<br>3. Run update check | Update dialog should be shown |
| VC-03 | Newer minor version | 1. Set current app version to "1.0.0"<br>2. Set server version to "1.1.0"<br>3. Run update check | Update dialog should be shown |
| VC-04 | Newer patch version | 1. Set current app version to "1.0.0"<br>2. Set server version to "1.0.1"<br>3. Run update check | Update dialog should be shown |
| VC-05 | Older version | 1. Set current app version to "2.0.0"<br>2. Set server version to "1.0.0"<br>3. Run update check | No update dialog should be shown |
| VC-06 | Different version formats | 1. Set current app version to "1.0"<br>2. Set server version to "1.0.1"<br>3. Run update check | Update dialog should be shown |
| VC-07 | Non-numeric version | 1. Set current app version to "1.0.0"<br>2. Set server version to "1.0.0-beta"<br>3. Run update check | Version comparison should handle this gracefully |

### 2. Network Handling Tests

| Test ID | Description | Test Steps | Expected Result |
|---------|-------------|------------|-----------------|
| NH-01 | No network connection | 1. Disable network connection<br>2. Run update check | No crash, error logged |
| NH-02 | Server unreachable | 1. Configure incorrect server URL<br>2. Run update check | No crash, error logged |
| NH-03 | Invalid JSON response | 1. Modify server to return invalid JSON<br>2. Run update check | No crash, error logged |
| NH-04 | Missing fields in JSON | 1. Modify server to return JSON without version field<br>2. Run update check | No crash, error logged |

### 3. Update Dialog Tests

| Test ID | Description | Test Steps | Expected Result |
|---------|-------------|------------|-----------------|
| UD-01 | Dialog appearance | 1. Configure newer version on server<br>2. Run update check | Dialog appears with correct title, message, and buttons |
| UD-02 | Changelog display | 1. Set changelog in metadata.json<br>2. Run update check | Dialog shows the changelog text |
| UD-03 | "Update Now" button | 1. Show update dialog<br>2. Click "Update Now" | Browser or download manager opens with correct APK URL |
| UD-04 | "Later" button | 1. Show update dialog<br>2. Click "Later" | Dialog dismisses, app continues normally |

### 4. Installation Tests

| Test ID | Description | Test Steps | Expected Result |
|---------|-------------|------------|-----------------|
| IN-01 | APK download | 1. Click "Update Now" in dialog<br>2. Observe download | APK downloads successfully |
| IN-02 | APK installation | 1. Download APK<br>2. Install APK | APK installs successfully |
| IN-03 | App upgrade | 1. Install newer version<br>2. Open app | App opens with new version, data preserved |

### 5. Publish Script Tests

| Test ID | Description | Test Steps | Expected Result |
|---------|-------------|------------|-----------------|
| PS-01 | Basic publish | 1. Run script with required parameters<br>2. Check server | APK and metadata.json uploaded correctly |
| PS-02 | Missing parameters | 1. Run script without version<br>2. Observe output | Error message, script exits |
| PS-03 | Invalid APK path | 1. Run script with non-existent APK path<br>2. Observe output | Error message, script exits |
| PS-04 | Server authentication | 1. Run script with incorrect credentials<br>2. Observe output | Error message, script exits |
| PS-05 | Metadata generation | 1. Run script with version and changelog<br>2. Check metadata.json | File contains correct version, URL, and changelog |

## Test Execution

### Test Data

Create test metadata.json files for each version comparison test:

```json
{
  "version": "x.y.z",
  "apk_url": "https://orthodmetrics.com/dev/omai-apk/omai-android-x.y.z.apk",
  "changelog": "Test changelog for version x.y.z"
}
```

### Test Procedure

1. For each test case:
   - Set up the test environment as specified
   - Execute the test steps
   - Record the actual result
   - Compare with the expected result
   - Mark as Pass/Fail

2. For any failures:
   - Document the issue
   - Identify the root cause
   - Fix the issue
   - Retest

## Test Reporting

Create a test report with the following information:

- Test case ID
- Test description
- Pass/Fail status
- Actual result (if different from expected)
- Comments/observations
- Screenshots (if applicable)

## Regression Testing

After fixing any issues, perform regression testing to ensure that:

1. The fixed issues are resolved
2. No new issues have been introduced
3. The app functions correctly with the auto-updater enabled

## Acceptance Criteria

The auto-updater implementation is considered successful if:

1. All test cases pass
2. The app can detect and install updates without user intervention beyond clicking "Update Now"
3. The publish script correctly uploads APKs and updates metadata
4. The system handles error conditions gracefully without crashing