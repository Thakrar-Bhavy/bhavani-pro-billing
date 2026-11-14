# 📚 Levox Outreach Tool - Complete Documentation

## 🎯 System Overview

This is a multi-channel outreach and lead management system that helps agencies generate personalized messages for LinkedIn, Email, WhatsApp, and Cold Calls while automatically storing all prospect data in Google Sheets.

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    USER INTERFACE (HTML)                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ Login Screen │→ │ Message Gen  │→ │ Output View  │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└─────────────────────────────────────────────────────────────────┘
                              ↓
                    (API Calls via Fetch)
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│              GOOGLE APPS SCRIPT (Backend API)                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ Login Handler│  │ Log Handler  │  │ User Manager │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└─────────────────────────────────────────────────────────────────┘
                              ↓
                    (SpreadsheetApp API)
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                     GOOGLE SHEETS (Database)                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ Users Sheet  │  │  Log_dev     │  │  Log_bhavy   │  ...     │
│  │ (Credentials)│  │ (Dev's CRM)  │  │ (Bhavy's CRM)│          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📂 File Structure

```
project/
├── linkedin-outreach-generator.html   # Frontend application
│   ├── UI Components (Login, Forms, Output)
│   ├── Message Generation Logic (Mistral AI)
│   └── Google Sheets Integration (Fetch API)
│
└── Code.gs                            # Backend API (Google Apps Script)
    ├── doGet()  → Health checks
    ├── doPost() → Login & Data logging
    └── Helper functions
```

---

## 🔄 Data Flow

### 1. **Login Flow**
```
User enters credentials
    ↓
HTML sends POST to Apps Script
    ↓
Apps Script checks Users sheet
    ↓
If valid: Return success + username
    ↓
HTML stores session in localStorage
    ↓
App interface unlocked
```

### 2. **Message Generation & Logging Flow**
```
User fills prospect details
    ↓
HTML generates message (using Mistral AI)
    ↓
HTML sends POST to Apps Script with:
  - Username (from session)
  - Prospect data
  - Generated message
    ↓
Apps Script validates user
    ↓
Apps Script appends row to Log_[username] sheet
    ↓
Success response returned
```

---

## 🗄️ Database Schema

### **Users Sheet**
| Column      | Type   | Description              |
|-------------|--------|--------------------------|
| Username    | String | Login username (unique)  |
| Password    | String | Login password           |
| Created On  | Date   | Account creation date    |

**Example Data:**
```
Username | Password  | Created On
---------|-----------|------------------
dev      | dev@123   | 2026-01-15 10:30
bhavy    | bhavy@11  | 2026-01-15 10:30
shreya   | shreya@12 | 2026-01-15 10:30
```

### **Log_[username] Sheets** (One per user)
| Column           | Type   | Description                    |
|------------------|--------|--------------------------------|
| Client Name      | String | Prospect's full name           |
| Company Name     | String | Company name                   |
| Email            | String | Email address                  |
| Website          | String | Company website                |
| Position         | String | Job title                      |
| Industry         | String | Industry sector                |
| Location         | String | Geographic location            |
| Pain Points      | String | Identified challenges          |
| Message Type     | String | Channel (LinkedIn/Email/etc)   |
| Message Content  | String | Full generated message         |
| Date & Time      | Date   | Auto-generated timestamp       |

**Example Data:**
```
Client Name   | Company    | Position | Message Type | Date & Time
--------------|------------|----------|--------------|-------------------
John Smith    | Acme Corp  | CEO      | LinkedIn     | 2026-04-13 14:30
Sarah Johnson | Tech Inc   | CMO      | Email        | 2026-04-13 15:45
```

---

## 🔐 Authentication System

### How It Works:
1. **Session Storage**: Uses `localStorage` to persist login state
2. **API Validation**: Each data logging request includes:
   - Username (from session)
   - API Secret Key (prevents unauthorized access)
3. **User Verification**: Apps Script checks if user exists before logging data

### Security Features:
- ✅ API secret key validation
- ✅ User existence verification
- ✅ Per-user data isolation (separate sheets)
- ⚠️ Basic password storage (plain text - for demo only)

### Production Recommendations:
- Implement password hashing (SHA-256 or bcrypt)
- Add session tokens with expiration
- Enable 2FA for sensitive data
- Rate limiting on login attempts

---

## 🔌 API Endpoints

### 1. **Health Check (GET)**
```
URL: YOUR_WEB_APP_URL?action=ping
Response: {"status":"ok","message":"API is running ✅"}
```

### 2. **Get Users (GET)**
```
URL: YOUR_WEB_APP_URL?action=getUsers&key=levox_outreach_2026
Response: {"status":"ok","users":[...]}
```

### 3. **Login (POST)**
```
Endpoint: YOUR_WEB_APP_URL
Method: POST
Headers: Content-Type: text/plain

Body:
{
  "action": "login",
  "username": "dev",
  "password": "dev@123"
}

Success Response:
{
  "status": "ok",
  "message": "Login successful",
  "username": "dev"
}

Error Response:
{
  "status": "error",
  "message": "Invalid credentials"
}
```

### 4. **Log Message (POST)**
```
Endpoint: YOUR_WEB_APP_URL
Method: POST
Headers: Content-Type: text/plain

Body:
{
  "action": "logMessage",
  "key": "levox_outreach_2026",
  "username": "dev",
  "clientName": "John Smith",
  "companyName": "Acme Corp",
  "email": "john@acme.com",
  "website": "acme.com",
  "position": "CEO",
  "industry": "Technology",
  "location": "San Francisco, CA",
  "painPoints": "Limited digital presence",
  "messageType": "LinkedIn",
  "messageContent": "Hi John, I noticed..."
}

Success Response:
{
  "status": "ok",
  "message": "Message logged for \"John Smith\" in dev's sheet ✅"
}

Error Response:
{
  "status": "error",
  "message": "User not found. Login first."
}
```

---

## 🎨 Frontend Features

### 1. **Multi-Channel Support**
- LinkedIn (Connection + Follow-up)
- Email (Subject + Body)
- WhatsApp (Single message)
- Cold Call (Full script with objection handling)

### 2. **Message Generation**
- Uses Mistral AI API for intelligent content creation
- ICP (Ideal Customer Profile) analysis
- Personalization based on prospect data
- Service-specific angle selection

### 3. **User Experience**
- Dark/Light mode toggle
- Real-time validation
- Copy-to-clipboard functionality
- Message regeneration
- Responsive design

---

## 🚀 Deployment Checklist

### Google Apps Script Setup:
- [ ] Create Google Sheet
- [ ] Copy Sheet ID
- [ ] Update SPREADSHEET_ID in Code.gs
- [ ] Save Code.gs
- [ ] Run setupSpreadsheet function
- [ ] Grant permissions
- [ ] Verify Users sheet created
- [ ] Deploy as Web App
- [ ] Copy Web App URL

### HTML File Setup:
- [ ] Update APPS_SCRIPT_URL with Web App URL
- [ ] Verify APPS_SCRIPT_KEY matches Code.gs
- [ ] Test in browser
- [ ] Verify login works
- [ ] Test message generation
- [ ] Confirm data appears in Google Sheet

---

## 📊 Usage Workflow

### For Users:
1. **Login** with provided credentials
2. **Choose** message type (LinkedIn/Email/WhatsApp/Cold Call)
3. **Fill** prospect details (manually or paste profile)
4. **Select** service focus (Branding/Website/SEO/etc)
5. **Generate** personalized message
6. **Review** ICP analysis and recommendations
7. **Copy** message to clipboard
8. **Data automatically logged** to personal Google Sheet

### For Admins:
1. **Add new users** to Users sheet
2. **Monitor** individual user sheets for activity
3. **Export** data for reporting/analysis
4. **Track** conversion rates by message type
5. **Analyze** which services generate most interest

---

## 🔧 Maintenance

### Adding New Users:
1. Open Google Sheet → **Users** tab
2. Add new row:
   ```
   username | password | [current date]
   ```
3. User's log sheet will be auto-created on first login

### Backing Up Data:
1. **File → Download → Excel (.xlsx)**
2. Or use Google Sheets backup/version history

### Updating Message Templates:
- Edit the message generation logic in HTML
- Modify `LEVOX_COMPANY_CONTEXT` constant
- Adjust ICP criteria in `ICP_CRITERIA` object

---

## 📈 Analytics & Reporting

### Available Data Points:
- Messages generated per user
- Channel distribution (LinkedIn vs Email vs etc)
- Industries targeted
- Geographic distribution
- Service focus trends
- Time-based activity patterns

### Example Queries (in Google Sheets):
```
// Count messages by type
=COUNTIF(I:I, "LinkedIn")

// Average messages per day
=COUNTA(K:K)/DAYS(MAX(K:K), MIN(K:K))

// Most common industry
=MODE(F:F)
```

---

## 🐛 Known Limitations

1. **Password Security**: Stored in plain text (demo only)
2. **No Session Expiration**: Login persists until manual logout
3. **Rate Limiting**: None (could be abused)
4. **Data Validation**: Minimal server-side validation
5. **Concurrent Access**: Last-write-wins (no conflict resolution)

---

## 🔮 Future Enhancements

### Suggested Improvements:
- [ ] Password hashing & encryption
- [ ] Session tokens with expiration
- [ ] Two-factor authentication
- [ ] Advanced analytics dashboard
- [ ] Email integration (send directly from app)
- [ ] Follow-up reminders
- [ ] Response tracking
- [ ] A/B testing for message variants
- [ ] Team collaboration features
- [ ] Role-based permissions (Admin/User)

---

## 📞 Support

### Common Issues:
See **TROUBLESHOOTING.md** for detailed solutions

### Quick Reference:
See **SETUP_GUIDE.md** for step-by-step setup

---

## 📄 License & Credits

**Created by**: Bhavym Dev & Team  
**Company**: Levox Infotech  
**Version**: 1.0  
**Last Updated**: April 2026  

---

## 🎉 Success Metrics

### System is working correctly if:
- ✅ Login succeeds with test credentials
- ✅ Messages generate successfully
- ✅ Data appears in Google Sheet within seconds
- ✅ Each user has their own isolated log sheet
- ✅ Timestamps are accurate
- ✅ All message types work (LinkedIn/Email/WhatsApp/Cold Call)

---

**For detailed troubleshooting, see TROUBLESHOOTING.md**  
**For setup instructions, see SETUP_GUIDE.md**
