/**
 * BHAVANI PROVISION STORE - KHATA BACKEND (v7: stricter AI understanding)
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
    Products: ['id', 'name', 'category', 'salePrice', 'updatedAt', 'nameEn', 'nameHi', 'unit', 'aliases'],
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
    } else if (action === 'names') {
      result = names_(body);
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
    nameEn: String(p.nameEn || '').trim(),
    nameHi: String(p.nameHi || '').trim(),
    unit: String(p.unit || '').trim(),
    aliases: String(p.aliases || '').trim(),
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
      } else if (action === 'deleteproduct') {
        const pid = String(op.id || '').trim();
        if (!pid) throw new Error('Delete operation is missing product ID');
        normalized.push({ action: action, sheet: 'Products', id: pid });
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
      if (op.action === 'deleteentry' || op.action === 'deleteproduct') {
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

function mistralKey_() {
  const k = PropertiesService.getScriptProperties().getProperty('MISTRAL_API_KEY');
  if (!k) throw new Error('MISTRAL_API_KEY is not set in Script properties');
  return k;
}

/** One chat call returning parsed JSON. provider: 'groq' (default) or 'mistral' (backup). */
function llm_(system, user, provider) {
  const m = provider === 'mistral';
  const res = UrlFetchApp.fetch(m ? 'https://api.mistral.ai/v1/chat/completions' : 'https://api.groq.com/openai/v1/chat/completions', {
    method: 'post',
    contentType: 'application/json',
    headers: { Authorization: 'Bearer ' + (m ? mistralKey_() : groqKey_()) },
    muteHttpExceptions: true,
    payload: JSON.stringify({
      model: m ? 'open-mistral-nemo-2407' : 'llama-3.3-70b-versatile',
      temperature: 0,
      response_format: { type: 'json_object' },
      messages: [{ role: 'system', content: system }, { role: 'user', content: user }]
    })
  });
  const data = JSON.parse(res.getContentText());
  if (res.getResponseCode() !== 200) throw new Error((data.error && (data.error.message || data.error)) || ('AI error ' + res.getResponseCode()));
  return JSON.parse(data.choices[0].message.content);
}

function aiUnderstand_(b) {
  const text = String(b.text || '').trim().slice(0, 1500);
  if (!text) throw new Error('Empty text');
  const customers = (b.customers || []).slice(0, 400);
  const products = (b.products || []).slice(0, 500);

  const system = [
    'BUSINESS: You work inside the "Bhavani Khata" app of Bhavani Provision Store, a grocery shop in Jamnagar, Gujarat. The app is a customer khata (udhar/credit ledger) and billing system. The shopkeeper speaks or types one natural sentence (Gujarati, Hindi, English or a mix, often in Latin letters, with spelling mistakes, broken grammar and speech-recognition errors). Your job is to turn that sentence into a precise structured entry. Understand the WHOLE meaning of the sentence; do not just correct single words.',
    '',
    'EXTRACT: customer, transaction type, products, quantity + unit for each product, price for each product (if said), payment amount, bill total, date.',
    '',
    'SEPARATE THESE CLEARLY:',
    '- CUSTOMER = a person (Ajay, Rakeshbhai, Ajaybhina = Ajaybhai\'s, "Ajay na" = Ajay\'s). ajay = aajay = અજય. Suffixes na/ni/nu/ne/ma/bhina/bhai ni are grammar, not part of any product.',
    '- PRODUCT = a grocery item (khand/sugar, bajro, juvar, chokha, tuver dal, chai pati ...).',
    '- QUANTITY + UNIT = weight/volume/count of ONE product.',
    '- PRICE = rupees (rs, rupiya, રૂપિયા, ₹, "/-") connected to ONE product.',
    '- PAYMENT AMOUNT = money received FROM the customer (jama, paid, aapya, ભર્યા, received). It is not a product price.',
    '- BILL TOTAL = an explicit overall total ("total 500", "kul 500", "કુલ 500"). It is not a product price.',
    'NEVER put these in items: na, nu, ne, ma, khata, khatama, account, lakho, likho, entry, karo, bill, banavo, cash, udhar, noted, name, aa, ok, mins, ના ખાતામાં, લખો, એન્ટ્રી કરો, or any customer name.',
    '',
    'TRANSACTION TYPE (mode): "credit" = bought on account (khatama, account ma, udhar, name entry karo, noted down in ...). "cash" = cash bill / રોકડ / immediate payment sale. "payment" = the customer paid money against old balance.',
    '',
    'QUANTITY RULES (return a number and a unit kg|g|l|ml|pc|pkt):',
    'અડધો/અડધા/aadho/half kilo = 0.5 kg (500 g); પા/પાવ કિલો = 0.25 kg; સવા કિલો = 1.25 kg; દોઢ કિલો = 1.5 kg; અઢી કિલો = 2.5 kg.',
    'Without the word kilo, hundreds mean grams: સો = 100 g, સવાસો = 125 g, દોઢસો = 150 g, બસો = 200 g, અઢીસો = 250 g, ત્રણસો = 300 g, પાંચસો = 500 g.',
    'Write numbers exactly as spoken. "2kg" = 2 kg, "500 gm" = 500 g, "be kilo" = 2 kg. If NO quantity was said for a product, set quantity null (do NOT invent one).',
    '',
    'PRICE RULES:',
    '- A price belongs to the product immediately BEFORE it ("bajro 2kg khand 3kg 100rs": 100 rs is for khand 3kg; bajro has no price).',
    '- priceKind "total": the rupees are for the whole stated quantity (khand 3kg 100rs => amount 100). priceKind "per_unit": the rupees are the rate per kg/litre/piece ("khand 60 rs kilo", "ભાવ 60", "kg na 60" => rate 60).',
    '- If no price was said for a product, amount and rate are null. NEVER invent, guess, change or round any price, quantity, product or customer name. Copy numbers exactly.',
    '',
    'CUSTOMER MATCHING: you get the existing customers. If the spoken name clearly means one of them, return that existing name EXACTLY. Otherwise return the cleaned spoken name (e.g. "Vijaybhai"). If no person was named, null.',
    'PRODUCT MATCHING: catalogue lines look like "GujaratiName|English|Hinglish|aliases". Set catalogName to the exact GujaratiName (text before the first "|") of the product the shopkeeper means (khand=ખાંડ=Sugar, bajro/bajra=બાજરી/બાજરો, juvar/jowar=જુવાર, chokha/chawal=ચોખા, tuver/toor dal=તુવેર દાળ). If unsure or no match, set catalogName null and put the spoken word in "name". Never swap in a different product.',
    'EVIDENCE: for every item copy the exact words from the shopkeeper\'s sentence that describe that item (product + quantity + price) into "evidence", character for character.',
    'DATE: only if said (kal/ગઈકાલે = yesterday, parso/પરમદિવસે = day before yesterday, or explicit date) as YYYY-MM-DD relative to "Today"; else null.',
    'If anything important is unclear, set "uncertain": true and describe it in "note" (shown to the shopkeeper as a warning). Do not guess silently.',
    '',
    'Reply with ONLY this JSON: {"customer":string|null,"mode":"credit|payment|cash","date":string|null,"paymentAmount":number|null,"billTotal":number|null,"uncertain":boolean,"note":string,"items":[{"catalogName":string|null,"name":string,"quantity":number|null,"unit":"kg|g|l|ml|pc|pkt|","amount":number|null,"rate":number|null,"priceKind":"total|per_unit|null","evidence":string}]}',
    '',
    'EXAMPLES',
    '"Ajaybhina khatama bajro 2kg khand 3kg 100rs" -> customer Ajaybhai (existing if present), credit, items [{બાજરી,"bajro",2,kg,null,null,null,"bajro 2kg"},{ખાંડ,"khand",3,kg,100,null,total,"khand 3kg 100rs"}]',
    '"Sugar 2kg 120rs" -> no customer, cash, [{ખાંડ,"Sugar",2,kg,120,null,total,"Sugar 2kg 120rs"}]',
    '"Rakesh bhai na khatama lakho અડધો કીલો ખાંડ" -> Rakeshbhai, credit, ખાંડ 0.5 kg, no price',
    '"Ajay account ma અઢીસો બાજરો સવાસો ચા પત્તી lakho" -> Ajay, credit, બાજરી 250 g, ચા પત્તી 125 g',
    '"Vijay bhai nu cash bill banavo 5 kg khand 60 rs kilo" -> Vijaybhai, cash, ખાંડ 5 kg rate 60 per_unit',
    '"Ajay e 500 rupiya aapya" -> Ajay, payment, paymentAmount 500, items []'
  ].join('\n');

  const user = 'Today: ' + (b.today || Utilities.formatDate(new Date(), BHAVANI.TIME_ZONE, 'yyyy-MM-dd')) +
    '\nExisting customers: ' + JSON.stringify(customers) +
    '\nProduct catalogue:\n' + products.join('\n') +
    '\nShopkeeper said: ' + JSON.stringify(text);
  return { ok: true, provider: b.provider === 'mistral' ? 'mistral' : 'groq', result: llm_(system, user, b.provider) };
}

/** Translate Gujarati product names for Hindi / English / Hinglish bills. */
function names_(b) {
  const names = (b.names || []).slice(0, 60);
  if (!names.length) return { ok: true, names: {} };
  const lang = { hi: 'Hindi (Devanagari script)', en: 'English', hl: 'Hinglish (Hindi/Gujarati words written in English letters, e.g. "Khand", "Chai Patti")' }[b.lang] || 'English';
  const system = 'Translate Gujarati grocery product names to ' + lang + '. Use the common shop name. Reply ONLY JSON: {"names":{"<gujarati>":"<translation>"}} using the exact Gujarati strings as keys. Never invent extra keys.';
  const user = JSON.stringify(names);
  let out;
  try { out = llm_(system, user, b.provider || 'groq'); }
  catch (e) { out = llm_(system, user, 'mistral'); }
  return { ok: true, names: out.names || {} };
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
  if (b.hint) payload.prompt = String(b.hint).slice(0, 520);
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

/** Run once from the editor to test the Mistral backup. */
function testMistral() {
  const r = aiUnderstand_({ provider: 'mistral', text: 'Ajay account ma 2 kilo khand lakho', today: Utilities.formatDate(new Date(), BHAVANI.TIME_ZONE, 'yyyy-MM-dd'), customers: ['Ajaybhai', 'Rakeshbhai'], products: ['ખાંડ|Sugar|Khand|', 'ચોખા|Rice|Chokha|chawal'] });
  Logger.log(JSON.stringify(r));
  return r;
}
