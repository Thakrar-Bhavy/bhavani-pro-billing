# 🔧 Configuration Template

## Copy this template and fill in your actual values

---

## 📋 Code.gs Configuration

```javascript
// ============================================================
// Line 5: SPREADSHEET_ID
// ============================================================

// ❌ WRONG (This is the web app URL - DO NOT USE THIS):
const SPREADSHEET_ID = 'https://script.google.com/macros/s/AKfyc.../exec';

// ✅ CORRECT (This is the actual Sheet ID from the URL):
const SPREADSHEET_ID = '1hG8xKp2Q4abcdefghijklmnop';
//                      ↑ Copy this part from your Google Sheet URL
//                      Google Sheets URL looks like:
//                      https://docs.google.com/spreadsheets/d/SHEET_ID_HERE/edit
//                                                           ↑ Use this part only


// ============================================================
// Line 6: API_SECRET_KEY
// ============================================================

// Keep this as is (or change to your own secret):
const API_SECRET_KEY = 'levox_outreach_2026';
```

---

## 📋 HTML Configuration

```javascript
// ============================================================
// Line 1307: APPS_SCRIPT_URL
// ============================================================

// ❌ WRONG (This is an old/different deployment):
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/OLD_DEPLOYMENT_ID/exec';

// ✅ CORRECT (Your current deployment URL):
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxxx.../exec';
//                       ↑ Copy the FULL URL from Apps Script deployment
//                       Steps to get this:
//                       1. Apps Script Editor → Deploy → Manage deployments
//                       2. Copy the "Web app" URL
//                       3. Should end with /exec


// ============================================================
// Line 1308: APPS_SCRIPT_KEY
// ============================================================

// Must match API_SECRET_KEY in Code.gs:
const APPS_SCRIPT_KEY = 'levox_outreach_2026';
//                       ↑ Must be EXACTLY the same as Code.gs
```

---

## ✅ How to Fill This Template

### Step 1: Get Your Sheet ID
1. Open your Google Sheet
2. Look at the URL in your browser
3. Example URL:
   ```
   https://docs.google.com/spreadsheets/d/1hG8xKp2Q4abc123xyz/edit
   ```
4. Copy only the part between `/d/` and `/edit`:
   ```
   1hG8xKp2Q4abc123xyz
   ```
5. This is your SPREADSHEET_ID

### Step 2: Deploy Web App
1. In Apps Script editor: Deploy → New deployment
2. Type: Web app
3. Execute as: Me
4. Who has access: Anyone
5. Click Deploy
6. Copy the URL (looks like):
   ```
   https://script.google.com/macros/s/AKfycbxAbCdEf123456.../exec
   ```
7. This is your APPS_SCRIPT_URL

### Step 3: Verify Keys Match
Make sure these are EXACTLY the same:
- Code.gs: `API_SECRET_KEY`
- HTML: `APPS_SCRIPT_KEY`

Default: `'levox_outreach_2026'`

---

## 📝 Quick Copy-Paste Template

Fill in the blanks below and use for quick reference:

```
MY CONFIGURATION:
=================

SPREADSHEET_ID (for Code.gs):
_________________________________

APPS_SCRIPT_URL (for HTML):
_________________________________

API_SECRET_KEY (for Code.gs):
levox_outreach_2026

APPS_SCRIPT_KEY (for HTML):
levox_outreach_2026

TEST CREDENTIALS:
Username: dev
Password: dev@123
```

---

## 🎯 Validation Checklist

Before testing, verify:

- [ ] SPREADSHEET_ID is just the ID (not a full URL)
- [ ] SPREADSHEET_ID is from your Google Sheet URL
- [ ] APPS_SCRIPT_URL is the full deployment URL
- [ ] APPS_SCRIPT_URL ends with `/exec`
- [ ] API_SECRET_KEY matches APPS_SCRIPT_KEY
- [ ] setupSpreadsheet function has been run
- [ ] Web app deployment is "Active"

---

## 🔍 Visual Guide: Where to Find Each Value

### Finding SPREADSHEET_ID:
```
Browser Address Bar (when viewing your Google Sheet):
┌─────────────────────────────────────────────────────────────────────┐
│ https://docs.google.com/spreadsheets/d/1hG8xKp2Q4abc123xyz/edit     │
└─────────────────────────────────────────────────────────────────────┘
                                            └──────┬───────┘
                                                   │
                                            Copy this part only
```

### Finding APPS_SCRIPT_URL:
```
Apps Script Deployment Dialog:
┌─────────────────────────────────────────────────────────────────────┐
│ New deployment                                                       │
│                                                                      │
│ Web app URL:                                                         │
│ https://script.google.com/macros/s/AKfycbxAbCdEf.../exec           │
│                                                                      │
│ [Copy]                                      [Done]                  │
└─────────────────────────────────────────────────────────────────────┘
       └────────────────────┬──────────────────┘
                            │
                     Copy the full URL
```

---

## 💡 Pro Tips

1. **Save your configuration**: Keep a copy of these values in a secure note
2. **Test incrementally**: Test each component (Sheet → Apps Script → HTML)
3. **Use browser dev tools**: F12 → Console to see API errors
4. **Check Apps Script logs**: View → Logs to debug backend issues

---

## 🆘 If Something Goes Wrong

1. Double-check all IDs/URLs are correct
2. Verify permissions were granted in Apps Script
3. Ensure deployment is "Active" (not archived)
4. Try redeploying the web app
5. Clear browser cache and test again

---

**Once all values are correct, your integration should work perfectly! 🎉**
