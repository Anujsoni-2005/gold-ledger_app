# Project History & Developer Log
**Project:** Gold Ledger
**Last Updated:** December 7, 2024

This document serves as a record of major changes, critical bugs encountered, and how they were resolved. Use this for future troubleshooting.

---

## 🛠️ Major Features Added

### 1. Android App Integration (Capacitor)
- **Tool:** Capacitor (`@capacitor/core`, `@capacitor/android`).
- **Strategy:** "Shell App" - The app loads the live Vercel URL (`https://gold-ledger-app.vercel.app`) instead of local files.
- **Benefit:** Ensures real-time updates without rebuilding the APK for every code change.

### 2. PDF Invoicing & Sharing
- **Library:** `jspdf` and `jspdf-autotable`.
- **Workflow:** Auto-generates a professional PDF invoice.
- **WhatsApp:** Auto-downloads the PDF and then opens WhatsApp for the user to attach it manually (due to API limitations).

### 3. Data Management
- **Exports:** Added Excel (`.xlsx`) and CSV export with UTF-8 BOM support for full compatibility.
- **Delete:** Added ability to delete specific sales records with confirmation.
- **Formatting:** Standardized all dates to `dd/mm/yyyy` (UK format).

---

## 🐛 Critical Errors & Solutions

### 1. Android Login Failure: "popup-closed-by-user"
*   **Issue:** Google Auth failed immediately on the phone.
*   **Cause:** The app was trying to run from `file://` or `localhost`, which Google considers insecure.
*   **Fix:** Configured `capacitor.config.json` to use the `server.url` pointing to the live HTTPS Vercel site.

### 2. Android Login blocked: "403 disallowed_useragent"
*   **Issue:** Google blocked the secure browser window with a 403 error.
*   **Cause:** Google detects embedded "WebViews" and blocks them for security.
*   **Fix:** Overrode the `UserAgent` string in `capacitor.config.json` to pretend to be a standard Chrome browser on Android.
    ```json
    "overrideUserAgent": "Mozilla/5.0 ... Chrome/..."
    ```

### 3. Android Auth Stuck in Browser
*   **Issue:** After logging in via the browser, the phone stayed in Chrome and didn't go back to the App.
*   **Cause:** The Android OS didn't know the App was allowed to handle the website link.
*   **Fix:** Added a specific **Intent Filter** (Deep Link) to `AndroidManifest.xml` with `autoVerify="true"` for the Vercel domain.

### 4. Excel/CSV Files Corrupted
*   **Issue:** Exported files were blank or unreadable.
*   **Cause:** Incorrect MIME types and missing Byte Order Marks (BOM).
*   **Fix:** 
    - **Excel:** Explicitly cast data to `Uint8Array` before creating Blob.
    - **CSV:** Prepend `\uFEFF` (BOM) to the text string so Excel recognizes it as UTF-8.

### 5. Mobile Redirect Loop
*   **Issue:** Some mobile browsers (like Instagram/WhatsApp in-app browsers) blocked the redirect flow.
*   **Fix:** Added a **"Try Popup Mode"** fallback button on the login screen for difficult environments.

---

## 📝 Maintenance Notes
*   **Code Updates:** Pushing to GitHub/Vercel automatically updates the Phone App (because of Live Mode).
*   **Native Updates:** If you change the **App Icon** or **App Name**, you MUST rebuild the APK in Android Studio.
