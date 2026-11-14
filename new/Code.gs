// ============================================================
// 🔧 CONFIGURATION — Update these values
// ============================================================

// ⚠️ IMPORTANT: Replace this with your actual Google Sheets ID
// To find your Sheet ID:
// 1. Open your Google Sheet
// 2. Look at the URL: https://docs.google.com/spreadsheets/d/SHEET_ID_HERE/edit
// 3. Copy the SHEET_ID_HERE part (between /d/ and /edit)
const SPREADSHEET_ID = 'YOUR_ACTUAL_SPREADSHEET_ID_HERE'; // ← CHANGE THIS!

const API_SECRET_KEY = 'levox_outreach_2026';       // ← Secret key for API validation

// ============================================================
// 📌 MAIN ENTRY POINTS — doGet & doPost
// ============================================================

/**
 * Handles GET requests (for testing or fetching data)
 * Usage: ?action=ping  → health check
 *        ?action=getUsers  → returns user list (admin only)
 */
function doGet(e) {
  try {
    const action = (e.parameter.action || '').toLowerCase();

    if (action === 'ping') {
      return jsonResponse({ status: 'ok', message: 'API is running ✅' });
    }

    if (action === 'getusers') {
      const key = e.parameter.key || '';
      if (key !== API_SECRET_KEY) {
        return jsonResponse({ status: 'error', message: 'Unauthorized' }, 401);
      }
      const users = getAllUsers();
      return jsonResponse({ status: 'ok', users: users });
    }

    return jsonResponse({ status: 'error', message: 'Unknown action' }, 400);

  } catch (error) {
    Logger.log('doGet Error: ' + error.message);
    return jsonResponse({ status: 'error', message: error.message }, 500);
  }
}

/**
 * Handles POST requests from the frontend
 * Actions:
 *   login      → validate user credentials
 *   logMessage → save generated message to user's sheet
 */
function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    const action = (body.action || '').toLowerCase();

    Logger.log('Received action: ' + action);

    // ── LOGIN ──
    if (action === 'login') {
      return handleLogin(body);
    }

    // ── LOG MESSAGE ──
    if (action === 'logmessage') {
      return handleLogMessage(body);
    }

    return jsonResponse({ status: 'error', message: 'Unknown action' }, 400);

  } catch (error) {
    Logger.log('doPost Error: ' + error.message);
    return jsonResponse({ status: 'error', message: error.message }, 500);
  }
}


// ============================================================
// 🔐 LOGIN HANDLER
// ============================================================

function handleLogin(body) {
  const username = (body.username || '').trim().toLowerCase();
  const password = (body.password || '').trim();

  Logger.log('Login attempt for username: ' + username);

  if (!username || !password) {
    return jsonResponse({ status: 'error', message: 'Username and password are required' });
  }

  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const usersSheet = getOrCreateSheet(ss, 'Users', ['Username', 'Password', 'Created On']);

    const data = usersSheet.getDataRange().getValues();

    // Skip header row (row 0), find matching user
    for (let i = 1; i < data.length; i++) {
      const storedUser = String(data[i][0]).trim().toLowerCase();
      const storedPass = String(data[i][1]).trim();

      if (storedUser === username && storedPass === password) {
        // ✅ Valid user — make sure their log sheet exists
        ensureUserSheet(ss, username);

        Logger.log('Login successful for: ' + username);

        return jsonResponse({
          status: 'ok',
          message: 'Login successful',
          username: username
        });
      }
    }

    Logger.log('Invalid credentials for: ' + username);
    return jsonResponse({ status: 'error', message: 'Invalid credentials' });

  } catch (error) {
    Logger.log('Login Error: ' + error.message);
    return jsonResponse({ status: 'error', message: 'Login failed: ' + error.message });
  }
}


// ============================================================
// 📝 LOG MESSAGE HANDLER
// ============================================================

function handleLogMessage(body) {
  // Validate API key
  const key = (body.key || '').trim();
  if (key !== API_SECRET_KEY) {
    Logger.log('Unauthorized log attempt - invalid API key');
    return jsonResponse({ status: 'error', message: 'Unauthorized — invalid API key' });
  }

  // Validate required fields
  const username = (body.username || '').trim().toLowerCase();
  if (!username) {
    return jsonResponse({ status: 'error', message: 'Username is required' });
  }

  const clientName   = body.clientName   || '';
  const companyName  = body.companyName  || '';
  const email        = body.email        || '';
  const website      = body.website      || '';
  const position     = body.position     || '';
  const industry     = body.industry     || '';
  const location     = body.location     || '';
  const painPoints   = body.painPoints   || '';
  const messageType  = body.messageType  || '';
  const messageContent = body.messageContent || '';

  if (!clientName || !messageType) {
    return jsonResponse({ status: 'error', message: 'Client name and message type are required' });
  }

  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);

    // Verify user exists in Users sheet
    if (!isValidUser(ss, username)) {
      Logger.log('User not found: ' + username);
      return jsonResponse({ status: 'error', message: 'User not found. Login first.' });
    }

    // Get or create the user's log sheet
    const userSheet = ensureUserSheet(ss, username);

    // Append the log row
    const timestamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss');

    userSheet.appendRow([
      clientName,
      companyName,
      email,
      website,
      position,
      industry,
      location,
      painPoints,
      messageType,
      messageContent,
      timestamp
    ]);

    Logger.log('Message logged for: ' + clientName + ' by user: ' + username);

    return jsonResponse({
      status: 'ok',
      message: `Message logged for "${clientName}" in ${username}'s sheet ✅`
    });

  } catch (error) {
    Logger.log('Log Message Error: ' + error.message);
    return jsonResponse({ status: 'error', message: 'Failed to log message: ' + error.message });
  }
}


// ============================================================
// 🛠️ HELPER FUNCTIONS
// ============================================================

/**
 * Returns a sheet by name, or creates it with headers if it doesn't exist.
 */
function getOrCreateSheet(spreadsheet, sheetName, headers) {
  let sheet = spreadsheet.getSheetByName(sheetName);

  if (!sheet) {
    sheet = spreadsheet.insertSheet(sheetName);

    if (headers && headers.length > 0) {
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);

      // Style the header row
      const headerRange = sheet.getRange(1, 1, 1, headers.length);
      headerRange.setFontWeight('bold');
      headerRange.setBackground('#1e293b');
      headerRange.setFontColor('#ffffff');
      sheet.setFrozenRows(1);
    }
  }

  return sheet;
}

/**
 * Creates a per-user log sheet with the correct column headers.
 */
function ensureUserSheet(spreadsheet, username) {
  const sheetName = 'Log_' + username;
  const headers = [
    'Client Name',
    'Company Name',
    'Email',
    'Website',
    'Position',
    'Industry',
    'Location',
    'Pain Points',
    'Message Type',
    'Message Content',
    'Date & Time'
  ];

  return getOrCreateSheet(spreadsheet, sheetName, headers);
}

/**
 * Checks if a username exists in the Users sheet.
 */
function isValidUser(spreadsheet, username) {
  const usersSheet = spreadsheet.getSheetByName('Users');
  if (!usersSheet) return false;

  const data = usersSheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]).trim().toLowerCase() === username) {
      return true;
    }
  }
  return false;
}

/**
 * Returns all users from the Users sheet (without passwords).
 */
function getAllUsers() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const usersSheet = ss.getSheetByName('Users');
  if (!usersSheet) return [];

  const data = usersSheet.getDataRange().getValues();
  const users = [];

  for (let i = 1; i < data.length; i++) {
    users.push({
      username: String(data[i][0]).trim(),
      createdOn: String(data[i][2] || '')
    });
  }

  return users;
}

/**
 * Returns a proper JSON response for the web app.
 */
function jsonResponse(data, statusCode) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}


// ============================================================
// 🚀 SETUP FUNCTION — Run this ONCE to initialize the sheet
// ============================================================

/**
 * Run this function manually from Apps Script editor to:
 * 1. Create the "Users" sheet with headers
 * 2. Add your default users
 * 3. Create their log sheets
 */
function setupSpreadsheet() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);

  // 1. Create Users sheet
  const usersSheet = getOrCreateSheet(ss, 'Users', ['Username', 'Password', 'Created On']);

  // 2. Add default users (modify these as needed)
  const defaultUsers = [
    ['dev',    'dev@123',    new Date()],
    ['bhavy',  'bhavy@11',  new Date()],
    ['shreya', 'shreya@12', new Date()]
  ];

  // Only add if the sheet is empty (just header)
  if (usersSheet.getLastRow() <= 1) {
    defaultUsers.forEach(user => {
      usersSheet.appendRow(user);
    });
    Logger.log('✅ Default users added.');
  } else {
    Logger.log('⚠️ Users already exist. Skipping.');
  }

  // 3. Create log sheets for each user
  defaultUsers.forEach(user => {
    ensureUserSheet(ss, user[0]);
  });

  Logger.log('✅ Setup complete! All sheets created.');
}
