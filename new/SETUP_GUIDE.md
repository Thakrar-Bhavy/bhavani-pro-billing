# 🔧 Google Sheets Integration Fix - Complete Setup Guide

## 📋 Problem Summary
1. **CRITICAL ERROR**: `SPREADSHEET_ID` in Code.gs is set to the web app URL instead of the actual Sheet ID
2. Login shows "User not found" because the script can't access the Google Sheet
3. Data logging fails for the same reason

---

## ✅ SOLUTION - Step-by-Step Setup

### **STEP 1: Create a New Google Sheet**

1. Go to https://sheets.google.com
2. Create a new blank spreadsheet
3. Name it: **"Levox Outreach CRM"** (or any name you prefer)
4. **Copy the Sheet ID from the URL**:
   - The URL looks like: `https://docs.google.com/spreadsheets/d/1ABC...XYZ/edit`
   - Copy only the part between `/d/` and `/edit`
   - Example: If URL is `https://docs.google.com/spreadsheets/d/1hG8xK...p2Q4/edit`
   - Then Sheet ID is: `1hG8xK...p2Q4`

---

### **STEP 2: Open Google Apps Script**

1. In your Google Sheet, click: **Extensions** → **Apps Script**
2. A new tab will open with the script editor
3. Delete any existing code in the editor
4. Copy the entire content from the **Code.gs** file I provided
5. Paste it into the script editor

---

### **STEP 3: Update the SPREADSHEET_ID**

1. Find line 5 in Code.gs:
   ```javascript
   const SPREADSHEET_ID = 'YOUR_ACTUAL_SPREADSHEET_ID_HERE';
   ```

2. Replace `'YOUR_ACTUAL_SPREADSHEET_ID_HERE'` with your Sheet ID from Step 1
   
   Example:
   ```javascript
   const SPREADSHEET_ID = '1hG8xKp2Q4...';
   ```

3. Click **Save** (Ctrl+S or Cmd+S)

---

### **STEP 4: Run Initial Setup**

1. In the Apps Script editor, find the function dropdown (top toolbar)
2. Select: **setupSpreadsheet**
3. Click the **▶ Run** button
4. **IMPORTANT**: You'll see a permission popup:
   - Click **Review permissions**
   - Choose your Google account
   - Click **Advanced** → **Go to [Project Name] (unsafe)**
   - Click **Allow**
5. Wait for it to complete (check **Execution log** at bottom)
6. You should see: `✅ Setup complete! All sheets created.`

---

### **STEP 5: Verify Sheet Setup**

Go back to your Google Sheet and verify these sheets were created:
- ✅ **Users** (with 3 default users)
- ✅ **Log_dev**
- ✅ **Log_bhavy**
- ✅ **Log_shreya**

**Default Users Created:**
| Username | Password  |
|----------|-----------|
| dev      | dev@123   |
| bhavy    | bhavy@11  |
| shreya   | shreya@12 |

---

### **STEP 6: Deploy the Web App**

1. In Apps Script editor, click: **Deploy** → **New deployment**
2. Click the gear icon ⚙️ next to "Select type"
3. Choose: **Web app**
4. Configure:
   - **Description**: "Levox Outreach API v1"
   - **Execute as**: **Me** (your email)
   - **Who has access**: **Anyone**
5. Click **Deploy**
6. **Copy the Web App URL** (looks like: `https://script.google.com/macros/s/AKfyc.../exec`)
7. Click **Done**

---

### **STEP 7: Update HTML File**

1. Open the **linkedin-outreach-generator.html** file
2. Find line 1307 (around the `APPS_SCRIPT_URL` constant)
3. Replace the existing URL with your **new Web App URL** from Step 6:

   ```javascript
   const APPS_SCRIPT_URL = 'YOUR_NEW_WEB_APP_URL_HERE';
   ```

   Example:
   ```javascript
   const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxxx.../exec';
   ```

4. Save the file

---

### **STEP 8: Test the Integration**

1. Open the HTML file in a web browser
2. Try logging in with:
   - **Username**: `dev`
   - **Password**: `dev@123`
3. If login succeeds:
   - ✅ You should see "Hi, Dev 👋" in the header
   - ✅ Generate a test message
   - ✅ Check your Google Sheet → **Log_dev** tab
   - ✅ You should see the logged data

---

## 🔍 Troubleshooting

### Issue: "User not found" during login
**Solution**:
1. Verify `SPREADSHEET_ID` in Code.gs is correct
2. Run `setupSpreadsheet` function again
3. Check the **Users** sheet has data

### Issue: Login works but data not logging
**Solution**:
1. Check browser console (F12) for errors
2. Verify `APPS_SCRIPT_URL` in HTML matches your deployed URL
3. Ensure `APPS_SCRIPT_KEY` matches in both files (should be `levox_outreach_2026`)

### Issue: "Unauthorized" error
**Solution**:
1. Verify `API_SECRET_KEY` in Code.gs is: `levox_outreach_2026`
2. Verify `APPS_SCRIPT_KEY` in HTML is: `levox_outreach_2026`
3. Both must match exactly

---

## 🎯 Key Configuration Summary

**In Code.gs (Lines to update):**
- Line 5: `SPREADSHEET_ID` → Your Google Sheet ID
- Line 6: `API_SECRET_KEY` → Keep as `levox_outreach_2026`

**In HTML file (Lines to update):**
- Line 1307: `APPS_SCRIPT_URL` → Your deployed web app URL
- Line 1308: `APPS_SCRIPT_KEY` → Keep as `levox_outreach_2026`

---

## 📊 What Gets Logged

When a user generates a message, the following data is saved to their log sheet:

1. Client Name
2. Company Name
3. Email
4. Website
5. Position
6. Industry
7. Location
8. Pain Points
9. Message Type (LinkedIn/Email/WhatsApp/Cold Call)
10. Message Content
11. Date & Time (auto-generated)

---

## 🔐 Security Notes

1. **API Secret Key**: Used to prevent unauthorized logging requests
2. **User Authentication**: Passwords stored in plain text in Users sheet (for demo purposes)
3. **For Production**: Consider implementing:
   - Password hashing
   - Session tokens
   - Rate limiting
   - Input validation

---

## 🆘 Still Having Issues?

1. Check the **Apps Script Execution Log**:
   - Apps Script Editor → **View** → **Logs**
   
2. Check browser console for frontend errors:
   - Press **F12** → **Console** tab

3. Verify deployment:
   - Apps Script → **Deploy** → **Manage deployments**
   - Ensure "Active" deployment exists

---

## ✅ Success Checklist

- [ ] Created Google Sheet and copied Sheet ID
- [ ] Updated SPREADSHEET_ID in Code.gs
- [ ] Ran setupSpreadsheet function
- [ ] Verified Users sheet and Log sheets created
- [ ] Deployed web app and copied URL
- [ ] Updated APPS_SCRIPT_URL in HTML
- [ ] Successfully logged in with test credentials
- [ ] Generated test message and verified data in Sheet
- [ ] All features working correctly

---

**🎉 Once all steps are complete, your Google Sheets integration will be fully functional!**
