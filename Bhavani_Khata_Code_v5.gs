/**
 * BHAVANI PROVISION STORE - KHATA BACKEND (v5: + Groq AI)
 * Compatible with Bhavani_Khata_Standalone_v4.html
 *
 * Frontend transport:
 *   GET ?action=bootstrap&callback=callbackName
 *   GET ?action=batch&ops=<JSON>&callback=callbackName
 *
 * Batch operations accepted:
 *   {action:"upsertCustomer", item:{id,name,phone,updatedAt}}
 *   {action:"upsertProduct",  item:{id,name,category,salePrice,updatedAt}}
 *   {action:"saveEntry",      item:{id,customerId,date,description,amount,type,quantity,unit,rate,productId,createdAt}}
 *   {action:"deleteEntry",    id:"record-id"}
 *
 * Spreadsheet tabs: Customers, Products, Entries.
 * This version is tolerant of older column orders and adds missing columns
 * without deleting or moving existing data.
 */

const BHAVANI = {
  SPREADSHEET_ID: '1e7qMs8mtPF3d1ofWK4xkQzsrWGfxXMpKROJ7mN8ayak',
  TIME_ZONE: 'Asia/Kolkata',
  LOCK_WAIT_MS: 20000,
  MAX_BATCH: 30,
  HEADERS: {
    Customers: ['id', 'name', 'phone', 'updatedAt'],
    Products: ['id', 'name', 'category', 'salePrice', 'updatedAt'],
    // Keep original columns first for compatibility with earlier deployments.
    Entries: ['id', 'customerId', 'date', 'description', 'amount', 'type',
      'createdAt', 'quantity', 'unit', 'rate', 'productId']
  }
};

/** Web app GET endpoint. The current HTML uses JSONP for cross-origin access. */
function doGet(e) {
  const p = e && e.parameter ? e.parameter : {};
  const action = String(p.action || 'bootstrap').toLowerCase();
  let result;

  try {
    if (action === 'ping') {
      ensureSheets_();
      result = {
        ok: true,
        message: 'Bhavani Khata API is ready',
        timestamp: new Date().toISOString(),
        spreadsheetId: BHAVANI.SPREADSHEET_ID
      };
    } else if (action === 'bootstrap' || action === 'getdata') {
      ensureSheets_();
      result = { ok: true, data: readAll_() };
    } else if (action === 'batch') {
      const ops = JSON.parse(p.ops || '[]');
      if (!Array.isArray(ops)) throw new Error('Batch operations must be an array');
      if (ops.length > BHAVANI.MAX_BATCH) {
        throw new Error('Too many operations. Maximum batch size is ' + BHAVANI.MAX_BATCH);
      }
      result = runBatch_(ops);
    } else {
      throw new Error('Unsupported action: ' + action);
    }
  } catch (err) {
    result = { ok: false, error: message_(err) };
  }

  return respond_(result, p.callback);
}

/** POST endpoint: AI understanding, voice transcription and batch diagnostics. */
function doPost(e) {
  let result;
  try {
    const raw = e && e.postData && e.postData.contents ? e.postData.contents : '{}';
    const body = JSON.parse(raw);
    const action = String(body.action || '').toLowerCase();

    if (action === 'ai') {
      result = aiUnderstand_(body);
    } else if (action === 'transcribe') {
      result = transcribe_(body);
    } else {
      ensureSheets_();
      if (action === 'batch') {
        result = runBatch_(body.ops || []);
      } else if (action === 'bootstrap' || action === 'getdata') {
        result = { ok: true, data: readAll_() };
      } else {
        throw new Error('Unsupported POST action: ' + action);
      }
    }
  } catch (err) {
    result = { ok: false, error: message_(err) };
  }
  return respond_(result, null);
}

function respond_(data, callback) {
  const json = JSON.stringify(data);
  const cb = String(callback || '');
  if (cb && /^[A-Za-z_$][A-Za-z0-9_$]{0,100}$/.test(cb)) {
    return ContentService.createTextOutput(cb + '(' + json + ');')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService.createTextOutput(json).setMimeType(ContentService.MimeType.JSON);
}

function spreadsheet_() {
  return SpreadsheetApp.openById(BHAVANI.SPREADSHEET_ID);
}

/**
 * Ensure required headers exist. Existing columns are retained in their current
 * positions; missing columns are appended. This supports earlier sheet layouts.
 */
function ensureSheets_() {
  const ss = spreadsheet_();
  Object.keys(BHAVANI.HEADERS).forEach(function(name) {
    let sh = ss.getSheetByName(name);
    if (!sh) sh = ss.insertSheet(name);

    const required = BHAVANI.HEADERS[name];
    if (sh.getLastRow() === 0 || sh.getLastColumn() === 0) {
      sh.getRange(1, 1, 1, required.length).setValues([required]);
      sh.setFrozenRows(1);
      sh.getRange(1, 1, 1, required.length).setFontWeight('bold');
      return;
    }

    let width = sh.getLastColumn();
    let current = sh.getRange(1, 1, 1, width).getDisplayValues()[0]
      .map(function(v) { return String(v || '').trim(); });

    // An entirely blank first row is safe to initialize.
    if (current.every(function(v) { return !v; })) {
      sh.getRange(1, 1, 1, required.length).setValues([required]);
      sh.setFrozenRows(1);
      return;
    }

    required.forEach(function(header) {
      if (current.indexOf(header) === -1) {
        width += 1;
        sh.getRange(1, width).setValue(header).setFontWeight('bold');
        current.push(header);
      }
    });
    sh.setFrozenRows(1);
  });
}

function headerMap_(sheet) {
  const width = sheet.getLastColumn();
  const headers = width
    ? sheet.getRange(1, 1, 1, width).getDisplayValues()[0]
    : [];
  const map = {};
  headers.forEach(function(h, i) {
    const key = String(h || '').trim();
    if (key) map[key] = i;
  });
  return map;
}

function readAll_() {
  return {
    customers: readSheet_('Customers'),
    products: readSheet_('Products'),
    entries: readSheet_('Entries')
  };
}

function readSheet_(name) {
  const sh = spreadsheet_().getSheetByName(name);
  const map = headerMap_(sh);
  const lastRow = sh.getLastRow();
  if (lastRow < 2) return [];

  const values = sh.getRange(2, 1, lastRow - 1, sh.getLastColumn()).getValues();
  return values.filter(function(row) {
    return map.id !== undefined && row[map.id] !== '' && row[map.id] !== null;
  }).map(function(row) {
    const obj = {};
    Object.keys(map).forEach(function(key) {
      let value = row[map[key]];
      if (['amount', 'salePrice', 'quantity', 'rate'].indexOf(key) >= 0) {
        value = value === '' || value === null ? '' : Number(value);
      }
      if (key === 'updatedAt' || key === 'createdAt') {
        value = value instanceof Date ? value.getTime() : Number(value || 0);
      }
      if (key === 'date' && value instanceof Date) {
        value = Utilities.formatDate(value, BHAVANI.TIME_ZONE, 'yyyy-MM-dd');
      }
      obj[key] = value;
    });
    return obj;
  });
}

function id_(value) {
  const v = String(value || '').trim();
  return v || Utilities.getUuid();
}

function normalizeCustomer_(c) {
  if (!c || !String(c.name || '').trim()) throw new Error('Customer name is required');
  return {
    id: id_(c.id),
    name: String(c.name).trim(),
    phone: String(c.phone || '').trim(),
    updatedAt: Number(c.updatedAt || Date.now())
  };
}

function normalizeProduct_(p) {
  if (!p || !String(p.name || '').trim()) throw new Error('Product name is required');
  let price = p.salePrice;
  if (price === '' || price === null || typeof price === 'undefined') {
    price = '';
  } else {
    price = Number(price);
    if (!isFinite(price) || price < 0) throw new Error('Invalid product selling price');
  }
  return {
    id: id_(p.id),
    name: String(p.name).trim(),
    category: String(p.category || 'Other').trim(),
    salePrice: price,
    updatedAt: Number(p.updatedAt || Date.now())
  };
}

function normalizeEntry_(e) {
  if (!e || !String(e.customerId || '').trim()) throw new Error('Entry customerId is required');
  const amount = Number(e.amount);
  if (!isFinite(amount) || amount <= 0) throw new Error('Entry amount must be greater than zero');

  const type = String(e.type || 'credit').toLowerCase();
  if (type !== 'credit' && type !== 'payment') throw new Error('Entry type must be credit or payment');

  const date = String(e.date || Utilities.formatDate(new Date(), BHAVANI.TIME_ZONE, 'yyyy-MM-dd'));
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error('Entry date must be YYYY-MM-DD');

  const qty = Number(e.quantity || 1);
  const rate = Number(e.rate || amount);
  if (!isFinite(qty) || qty <= 0) throw new Error('Entry quantity must be greater than zero');
  if (!isFinite(rate) || rate < 0) throw new Error('Entry rate is invalid');

  return {
    id: id_(e.id),
    customerId: String(e.customerId).trim(),
    date: date,
    description: String(e.description || (type === 'payment' ? 'Payment received' : 'Purchase')).trim(),
    amount: amount,
    type: type,
    createdAt: Number(e.createdAt || Date.now()),
    quantity: qty,
    unit: String(e.unit || ''),
    rate: rate,
    productId: String(e.productId || '')
  };
}

/**
 * Executes a batch under one script lock. Rows are located by stable ID.
 * Repeated offline retries update the same row rather than creating duplicates.
 */
function runBatch_(ops) {
  if (!Array.isArray(ops)) throw new Error('Operations must be an array');
  if (ops.length > BHAVANI.MAX_BATCH) throw new Error('Maximum batch size is ' + BHAVANI.MAX_BATCH);

  const lock = LockService.getScriptLock();
  lock.waitLock(BHAVANI.LOCK_WAIT_MS);
  try {
    ensureSheets_();

    const normalized = [];
    ops.forEach(function(op) {
      if (!op || !op.action) throw new Error('Invalid operation in batch');
      const action = String(op.action).toLowerCase();
      if (action === 'upsertcustomer') {
        normalized.push({ action: action, sheet: 'Customers', item: normalizeCustomer_(op.item) });
      } else if (action === 'upsertproduct') {
        normalized.push({ action: action, sheet: 'Products', item: normalizeProduct_(op.item) });
      } else if (action === 'saveentry') {
        normalized.push({ action: action, sheet: 'Entries', item: normalizeEntry_(op.item) });
      } else if (action === 'deleteentry') {
        const targetId = String(op.id || '').trim();
        if (!targetId) throw new Error('Delete operation is missing entry ID');
        normalized.push({ action: action, sheet: 'Entries', id: targetId });
      } else {
        throw new Error('Unknown batch operation: ' + action);
      }
    });

    // Cache each tab's ID->row lookup once per batch.
    const caches = {};
    ['Customers', 'Products', 'Entries'].forEach(function(name) {
      const sh = spreadsheet_().getSheetByName(name);
      const map = headerMap_(sh);
      const last = sh.getLastRow();
      const ids = last > 1 && map.id !== undefined
        ? sh.getRange(2, map.id + 1, last - 1, 1).getDisplayValues()
        : [];
      const lookup = {};
      ids.forEach(function(r, i) { if (r[0]) lookup[String(r[0])] = i + 2; });
      caches[name] = { sheet: sh, map: map, lookup: lookup, appends: [] };
    });

    let processed = 0;
    normalized.forEach(function(op) {
      const cache = caches[op.sheet];
      if (op.action === 'deleteentry') {
        const rowNum = cache.lookup[op.id];
        if (rowNum) {
          cache.sheet.deleteRow(rowNum);
          // A later operation in this same batch may reference shifted rows.
          cache.lookup = rebuildLookup_(cache.sheet, cache.map);
        }
        processed++;
        return;
      }

      const item = op.item;
      const rowNum = cache.lookup[String(item.id)];
      const rowValues = rowValuesFor_(cache.sheet, cache.map, item);
      if (rowNum && rowNum > 0) {
        cache.sheet.getRange(rowNum, 1, 1, cache.sheet.getLastColumn()).setValues([rowValues]);
      } else if (rowNum && rowNum < 0) {
        // This ID was appended earlier in the same batch; update that pending row.
        cache.appends[-rowNum - 1] = rowValues;
      } else {
        cache.appends.push(rowValues);
        // Negative row marker points to the pending append slot.
        cache.lookup[String(item.id)] = -cache.appends.length;
      }
      processed++;
    });

    Object.keys(caches).forEach(function(name) {
      const c = caches[name];
      if (c.appends.length) {
        const start = c.sheet.getLastRow() + 1;
        c.sheet.getRange(start, 1, c.appends.length, c.sheet.getLastColumn())
          .setValues(c.appends);
      }
    });

    return { ok: true, processed: processed, timestamp: Date.now() };
  } finally {
    lock.releaseLock();
  }
}

function rowValuesFor_(sheet, map, item) {
  const width = sheet.getLastColumn();
  const row = new Array(width).fill('');
  Object.keys(map).forEach(function(key) {
    if (Object.prototype.hasOwnProperty.call(item, key)) {
      row[map[key]] = item[key] === null || typeof item[key] === 'undefined' ? '' : item[key];
    }
  });
  return row;
}

function rebuildLookup_(sheet, map) {
  const out = {};
  if (map.id === undefined || sheet.getLastRow() < 2) return out;
  sheet.getRange(2, map.id + 1, sheet.getLastRow() - 1, 1).getDisplayValues()
    .forEach(function(r, i) { if (r[0]) out[String(r[0])] = i + 2; });
  return out;
}

/** Run once manually from the Apps Script editor. */
function setupBhavaniKhata() {
  ensureSheets_();
  const report = testBhavaniKhata();
  Logger.log(JSON.stringify(report));
  return report;
}

/** Manual diagnostic for spreadsheet permissions, tabs, headers and record counts. */
function testBhavaniKhata() {
  ensureSheets_();
  const ss = spreadsheet_();
  const data = readAll_();
  const result = {
    ok: true,
    spreadsheetName: ss.getName(),
    spreadsheetId: BHAVANI.SPREADSHEET_ID,
    tabs: {
      Customers: data.customers.length,
      Products: data.products.length,
      Entries: data.entries.length
    },
    testedAt: new Date().toISOString()
  };
  Logger.log(JSON.stringify(result));
  return result;
}

/** Test JSON serialization and validation without writing any records. */
function testBhavaniPayloadValidation() {
  const c = normalizeCustomer_({ id: 'test-customer', name: 'Test Customer', phone: '0000000000' });
  const p = normalizeProduct_({ id: 'test-product', name: 'Test Product', category: 'Test', salePrice: 25 });
  const e = normalizeEntry_({
    id: 'test-entry', customerId: c.id, date: '2026-11-14',
    description: 'Test Product 1 kg', amount: 25, type: 'credit',
    quantity: 1, unit: 'kg', rate: 25, productId: p.id, createdAt: Date.now()
  });
  return { ok: true, customer: c, product: p, entry: e };
}

function message_(err) {
  return String(err && err.message ? err.message : err);
}


/* ================= GROQ AI (key is stored in Script Properties, never in the website) =================
 * Setup: Project Settings (gear icon) > Script properties > Add property
 *        Name: GROQ_API_KEY    Value: <your Groq key>
 */
function groqKey_() {
  const k = PropertiesService.getScriptProperties().getProperty('GROQ_API_KEY');
  if (!k) throw new Error('GROQ_API_KEY is not set in Script properties');
  return k;
}

function aiUnderstand_(b) {
  const text = String(b.text || '').trim().slice(0, 1500);
  if (!text) throw new Error('Empty text');
  const customers = (b.customers || []).slice(0, 400);
  const products = (b.products || []).slice(0, 500);

  const system = [
    'You are the entry-understanding engine of "Bhavani Provision Store", a grocery shop in Jamnagar, Gujarat.',
    'The shopkeeper speaks or types in Gujarati, Hindi, English or a mix, often written in Latin letters (e.g. khand=ખાંડ, bajro=બાજરો, chai pati=ચા પત્તી, lakho/likho=write, khatama=ના ખાતામાં, "rakeshbhain"=Rakeshbhai\'s). Speech-to-text and typing contain spelling mistakes, broken words and filler words; infer the intended meaning and ignore noise such as "mins", "please", "ok".',
    'Extract:',
    '1) customer: the person whose account it is (name with bhai/ben/bhabhi suffix). If an existing customer from the list clearly matches (spelling/transliteration/script differences), return that existing name EXACTLY. Otherwise return the cleaned name (e.g. "Rakeshbhai"). null if no customer is mentioned.',
    '2) mode: "credit" (udhar / khata / put on account — default when a customer is named), "payment" (customer paid money / jama / received), or "cash" (cash bill / રોકડ / no customer, immediate sale).',
    '3) items: each product with quantity and unit. Match to the catalog: catalogName = the EXACT catalog string of the best match (handle spelling, transliteration, Gujarati/Hindi/English names); if there is no sensible match set catalogName null and name = the product name (Gujarati script if you can). quantity is a number; unit is one of kg, g, l, ml, pc, pkt or "". Understand: અડધો/aadho=0.5, પા/paav=0.25, સવા=1.25, દોઢ/dedh=1.5, અઢી/adhi=2.5. A bare number before a product usually means kg for loose goods.',
    '4) amount: ONLY if a price was explicitly spoken for that item — the TOTAL for that line. Otherwise null. Never invent prices.',
    '5) paymentAmount: number for mode "payment", else null.',
    '6) date: YYYY-MM-DD only if the shopkeeper mentioned one (kal/ગઈકાલે=yesterday, parso/પરમદિવસે=day before yesterday, or an explicit date), else null. Use the given "Today".',
    'Reply with ONLY this JSON: {"customer":string|null,"mode":"credit|payment|cash","date":string|null,"paymentAmount":number|null,"items":[{"catalogName":string|null,"name":string,"quantity":number,"unit":string,"amount":number|null}]}',
    'Example: "rakeshbhain akhatama 2kg khand 10kg bajro 5kg chai pati lakho mins" -> customer Rakeshbhai (existing match if present), mode credit, items: ખાંડ 2 kg, બાજરો/બાજરી 10 kg, ચા પત્તી 5 kg, all amounts null.'
  ].join('\n');

  const user = 'Today: ' + (b.today || Utilities.formatDate(new Date(), BHAVANI.TIME_ZONE, 'yyyy-MM-dd')) +
    '\nExisting customers: ' + JSON.stringify(customers) +
    '\nProduct catalog: ' + JSON.stringify(products) +
    '\nShopkeeper said: ' + JSON.stringify(text);

  const res = UrlFetchApp.fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'post',
    contentType: 'application/json',
    headers: { Authorization: 'Bearer ' + groqKey_() },
    muteHttpExceptions: true,
    payload: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      temperature: 0,
      response_format: { type: 'json_object' },
      messages: [{ role: 'system', content: system }, { role: 'user', content: user }]
    })
  });
  const data = JSON.parse(res.getContentText());
  if (res.getResponseCode() !== 200) throw new Error((data.error && data.error.message) || ('Groq error ' + res.getResponseCode()));
  return { ok: true, result: JSON.parse(data.choices[0].message.content) };
}

/** Voice fallback for phones/browsers where built-in speech recognition fails. */
function transcribe_(b) {
  if (!b.audio) throw new Error('No audio received');
  if (String(b.audio).length > 6000000) throw new Error('Recording too long');
  const type = String(b.mime || 'audio/webm').split(';')[0];
  const ext = type.indexOf('mp4') >= 0 ? 'mp4' : type.indexOf('ogg') >= 0 ? 'ogg' : 'webm';
  const blob = Utilities.newBlob(Utilities.base64Decode(b.audio), type, 'voice.' + ext);
  const payload = { file: blob, model: 'whisper-large-v3', response_format: 'json', temperature: '0' };
  if (b.lang) payload.language = String(b.lang).slice(0, 2);
  if (b.hint) payload.prompt = String(b.hint).slice(0, 400);
  const res = UrlFetchApp.fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
    method: 'post',
    headers: { Authorization: 'Bearer ' + groqKey_() },
    muteHttpExceptions: true,
    payload: payload
  });
  const data = JSON.parse(res.getContentText());
  if (res.getResponseCode() !== 200) throw new Error((data.error && data.error.message) || ('Groq error ' + res.getResponseCode()));
  return { ok: true, text: String(data.text || '').trim() };
}

/** Run once from the editor to authorize internet access and test the AI. */
function testGroq() {
  const r = aiUnderstand_({
    text: 'rakeshbhain akhatama 2kg khand 10kg bajro 5kg chai pati lakho mins',
    today: Utilities.formatDate(new Date(), BHAVANI.TIME_ZONE, 'yyyy-MM-dd'),
    customers: ['Rakeshbhai', 'Mukeshbhai'], products: ['ખાંડ', 'બાજરીનો લોટ', 'ચા પત્તી']
  });
  Logger.log(JSON.stringify(r));
  return r;
}
