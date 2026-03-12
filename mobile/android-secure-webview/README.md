# UniTest Secure Android Wrapper

This Android app wraps `https://unitest.systems` in a secure `WebView` and enables `FLAG_SECURE`.

## Why this exists

- On mobile browsers, screenshot blocking is not reliably enforceable.
- On Android native apps, `FLAG_SECURE` can block screenshots/screen recording for the app window.
- iOS Safari/WebView has no equivalent hard block.

## What this app does

- Loads `https://unitest.systems` in a `WebView`
- Sets `FLAG_SECURE` on startup/resume
- Adds a custom user-agent suffix: `UniTestSecureAndroid/1.0`
- Keeps cookies enabled for login/session flows
- Restricts in-app navigation to `unitest.systems` and opens external links outside the app

## Build

1. Open `mobile/android-secure-webview` in Android Studio.
2. Let Gradle sync.
3. Build and run the `app` module on a device.

## Notes

- This protects Android users only when they use this app.
- If users open the website in normal mobile browsers, screenshot blocking is not guaranteed.
