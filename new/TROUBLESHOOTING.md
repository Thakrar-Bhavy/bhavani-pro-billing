# 🚨 Quick Troubleshooting Reference

## Common Error Messages & Solutions

### ❌ "User not found"
**Cause**: Apps Script cannot access the Google Sheet
**Fix**:
1. Check `SPREADSHEET_ID` in Code.gs (must be Sheet ID, NOT web app URL)
2. Run `setupSpreadsheet` function in Apps Script
3. Grant permissions when prompted

---

### ❌ "Invalid credentials"
**Cause**: Username/password mismatch
**Fix**:
1. Open Google Sheet → **Users** tab
2. Verify username and password exist
3. Check for typos (username is case-insensitive, password is case-sensitive)

**Default credentials**:
- dev / dev@123
- bhavy / bhavy@11
- shreya / shreya@12

---

### ❌ "Server error — please try again"
**Cause**: Web app URL is incorrect or deployment failed
**Fix**:
1. Verify `APPS_SCRIPT_URL` in HTML points to your deployed web app
2. In Apps Script → **Deploy** → **Manage deployments**
3. Ensure deployment is "Active"
4. Copy the correct URL and update HTML

---

### ❌ "Unauthorized — invalid API key"
**Cause**: API secret key mismatch
**Fix**:
1. Code.gs line 6: `const API_SECRET_KEY = 'levox_outreach_2026';`
2. HTML line 1308: `const APPS_SCRIPT_KEY = 'levox_outreach_2026';`
3. Both MUST match exactly

---

### ❌ Data not appearing in Google Sheet
**Cause**: Logging function not being called or failing silently
**Fix**:
1. Open browser console (F12)
2. Look for console warnings: `⚠️ Sheet logging failed`
3. Check if Web App URL is correct
4. Verify user has a Log sheet (e.g., Log_dev)
5. Check Apps Script execution logs

---

## 🔍 How to Check Apps Script Logs

1. Open Apps Script editor
2. Click **View** → **Executions**
3. Look for recent POST requests
4. Check for errors in the log column
5. Common issues:
   - "Cannot read property '0' of undefined" → Users sheet is empty
   - "Spreadsheet not found" → Wrong SPREADSHEET_ID
   - "Permission denied" → Need to grant permissions

---

## 📝 Configuration Checklist

### Code.gs (Apps Script)
```javascript
// Line 5 - MUST be Sheet ID (NOT web app URL)
const SPREADSHEET_ID = '1hG8xK...p2Q4'; // ✅ Correct format

// Line 6 - API Secret Key
const API_SECRET_KEY = 'levox_outreach_2026'; // ✅ Must match HTML
```

### HTML File
```javascript
// Line 1307 - Web App URL (from deployment)
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfyc.../exec'; // ✅

// Line 1308 - Must match Code.gs
const APPS_SCRIPT_KEY = 'levox_outreach_2026'; // ✅
```

---

## ⚡ Quick Test Procedure

1. **Test API Health**:
   - Open: `YOUR_WEB_APP_URL?action=ping`
   - Should see: `{"status":"ok","message":"API is running ✅"}`

2. **Test Login**:
   - Username: `dev`
   - Password: `dev@123`
   - Should see: "Hi, Dev 👋"

3. **Test Data Logging**:
   - Generate any message
   - Check Google Sheet → **Log_dev** tab
   - Should see new row with timestamp

---

## 🔄 Common URLs Explained

### Google Sheet URL
```
https://docs.google.com/spreadsheets/d/SHEET_ID_HERE/edit
                                         ↑
                                    Use this part only
```

### Apps Script Web App URL (for HTML)
```
https://script.google.com/macros/s/AKfycbxxx.../exec
                                    ↑
                               Full URL needed
```

**IMPORTANT**: These are DIFFERENT!
- SPREADSHEET_ID → Just the ID part
- APPS_SCRIPT_URL → Full deployment URL

---

## 🛠️ Reset & Restart

If everything is broken:

1. **Delete all sheets** except Sheet1 in your Google Sheet
2. **Run setupSpreadsheet** function again
3. **Redeploy** web app (Deploy → New deployment)
4. **Update HTML** with new web app URL
5. **Test** with dev/dev@123

---

## 📞 Debug Workflow

1. ✅ Can you open the Google Sheet? (Check Sheet ID)
2. ✅ Does Users sheet have data? (Run setupSpreadsheet)
3. ✅ Can you access ?action=ping? (Check deployment)
4. ✅ Does login work? (Check credentials & permissions)
5. ✅ Does data log? (Check browser console & Apps Script logs)

---

## 🎯 Expected Behavior

### ✅ Correct Setup:
- Login: "Hi, [Name] 👋" appears
- Generate message: Success message shows
- Google Sheet: New row in Log_[username] tab
- Console: "✅ Logged to Google Sheets"

### ❌ Broken Setup:
- Login: "User not found" error
- Generate message: No data in sheet
- Console: "⚠️ Sheet logging failed"
- Apps Script logs: Errors about permissions or not found

---

**Remember**: The most common mistake is using the web app URL as the SPREADSHEET_ID. 
The SPREADSHEET_ID should look like: `1hG8xKp2Q4...` (just the ID)
NOT like: `https://script.google.com/...` (that's the web app URL for HTML)
