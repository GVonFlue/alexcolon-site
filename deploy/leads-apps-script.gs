/**
 * Google Apps Script: the lead Sheet receiver.
 *
 * This is the other end of LEAD_SHEET_WEBHOOK_URL, and it is the whole thing:
 * one file, paste it in fresh over the placeholder Apps Script gives you and
 * there is nothing else to add. The request shape it expects is documented in
 * docs/lead-payload.md, which is written so the CRM can be built against it
 * without reading any of this.
 *
 * The Sheet is the source of truth on a ProyTech build, which makes this the
 * highest priority sink: the CRM and GHL can both be down and the lead is
 * still safe as long as this runs.
 *
 * ---------------------------------------------------------------------------
 * SETUP, once
 * ---------------------------------------------------------------------------
 * 1. Create a Google Sheet. Name the first tab "Leads".
 * 2. Extensions > Apps Script. Delete the placeholder, paste this whole file.
 * 3. Project Settings > Script Properties > Add script property:
 *       SHARED_SECRET = <a long random string you generate>
 *    Generate one with:  openssl rand -hex 32
 *    Do NOT put the secret in this file. It lives in Script Properties only.
 * 4. Deploy > New deployment > type "Web app".
 *       Execute as:        Me
 *       Who has access:    Anyone
 *    "Anyone" is required because Vercel calls this without a Google identity.
 *    The shared secret is what actually guards it, which is why step 3 matters.
 * 5. Copy the /exec URL it gives you. That is LEAD_SHEET_WEBHOOK_URL.
 *    Put the same secret in LEAD_SHEET_SHARED_SECRET on Vercel.
 * 6. Run testAppend() once from the editor to create the header row and to
 *    trigger the authorization prompt. Approve it. Delete the test row after.
 *
 * Re-deploying after an edit: Deploy > Manage deployments > edit the existing
 * one > Version: New version. Creating a NEW deployment gives a new URL and the
 * site keeps posting to the old one, which is a silent way to lose leads.
 * ---------------------------------------------------------------------------
 */

var SHEET_NAME = 'Leads';

var COLUMNS = [
  'receivedAt',
  'deployment',
  'sourceTag',
  'name',
  'email',
  'phone',
  'detail',
  'message',
  'route',
  'externalRef',
  'ip',
  'userAgent',
  'updatedAt',
];

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return json({ ok: false, error: 'empty body' });
    }

    var body = JSON.parse(e.postData.contents);

    var expected = PropertiesService.getScriptProperties().getProperty('SHARED_SECRET');
    if (!expected) {
      // Fail loud rather than accepting everything because setup was skipped.
      console.error('SHARED_SECRET is not set in Script Properties. Rejecting.');
      return json({ ok: false, error: 'not configured' });
    }
    if (!secretsMatch_(String(body.secret || ''), expected)) {
      console.warn('Rejected a post with a bad or missing secret.');
      return json({ ok: false, error: 'forbidden' });
    }

    var sheet = getSheet_();
    ensureHeader_(sheet);

    /**
     * Chatbot leads carry an externalRef derived from the visitor's session, so
     * a follow-up message updates that row instead of creating a second, half
     * filled lead. Form leads have no externalRef and always append.
     */
    var ref = String(body.externalRef || '').trim();
    var rowIndex = ref ? findRowByExternalRef_(sheet, ref) : -1;

    var values = COLUMNS.map(function (key) {
      if (key === 'updatedAt') return rowIndex > 0 ? new Date() : '';
      var v = body[key];
      return v === undefined || v === null ? '' : String(v);
    });

    if (rowIndex > 0) {
      // Merge rather than overwrite: a follow-up that only adds a phone number
      // must not blank out the name captured in the first message.
      var existing = sheet.getRange(rowIndex, 1, 1, COLUMNS.length).getValues()[0];
      var merged = values.map(function (incoming, i) {
        if (COLUMNS[i] === 'updatedAt') return new Date();
        if (COLUMNS[i] === 'receivedAt') return existing[i] || incoming;
        return incoming !== '' ? incoming : existing[i];
      });
      sheet.getRange(rowIndex, 1, 1, COLUMNS.length).setValues([merged]);
      // No notification on an update. The first message already sent one.
      return json({ ok: true, action: 'updated', row: rowIndex });
    }

    sheet.appendRow(values);
    tintIfNotProduction_(sheet, sheet.getLastRow(), String(body.deployment || ''));

    /**
     * Speed to lead. Sending from here rather than from a separate endpoint
     * means the notification rides on the sink that is hardest to lose, and it
     * removes one moving part from the deploy. Never let a mail failure fail
     * the write: the lead is already safely in the Sheet by this point.
     */
    try {
      notifyOnNewLead_(body);
    } catch (mailErr) {
      console.error('Lead saved, notification failed: ' + mailErr);
    }

    return json({ ok: true, action: 'appended', row: sheet.getLastRow() });
  } catch (err) {
    /**
     * Log the raw payload before giving up. The site treats a non-2xx as a sink
     * failure and writes its own recoverable line, but having it on both sides
     * means a malformed body can still be replayed by hand.
     */
    console.error('Lead receiver failed: ' + err + ' :: raw=' + (e && e.postData ? e.postData.contents : 'none'));
    return json({ ok: false, error: 'server error' });
  }
}

function doGet() {
  // No data is ever served from here.
  return json({ ok: false, error: 'method not allowed' });
}

/**
 * Compare the secret without short-circuiting on the first differing byte.
 *
 * Apps Script has no timing-safe compare, and the realistic threat here is low:
 * this endpoint is a URL nobody has, and the round trip through Google's
 * infrastructure buries microsecond differences in tens of milliseconds of
 * noise. It is written this way anyway because it costs three lines, and
 * "the network noise probably hides it" is a worse thing to have written down
 * than a loop that does not leak in the first place.
 */
function secretsMatch_(given, expected) {
  if (given.length !== expected.length) return false;
  var diff = 0;
  for (var i = 0; i < given.length; i++) {
    diff |= given.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return diff === 0;
}

/**
 * Preview and local rows are tinted so nobody mistakes one for a real lead
 * while skimming. The site sends `deployment` as its own field and also stamps
 * it onto the source tag; this keys on the field, because parsing it back out
 * of a tag works right up until somebody renames a tag.
 */
function tintIfNotProduction_(sheet, rowIndex, deployment) {
  if (!deployment || deployment === 'production') return;
  sheet
    .getRange(rowIndex, 1, 1, COLUMNS.length)
    .setBackground('#FFF4E5')
    .setFontColor('#7A5A20');
}

function getSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(SHEET_NAME);
  return sheet;
}

function ensureHeader_(sheet) {
  if (sheet.getLastRow() > 0) return;
  sheet.appendRow(COLUMNS);
  sheet.getRange(1, 1, 1, COLUMNS.length).setFontWeight('bold');
  sheet.setFrozenRows(1);
}

function findRowByExternalRef_(sheet, ref) {
  var last = sheet.getLastRow();
  if (last < 2) return -1;
  var col = COLUMNS.indexOf('externalRef') + 1;
  var values = sheet.getRange(2, col, last - 1, 1).getValues();
  for (var i = values.length - 1; i >= 0; i--) {
    // Compared as strings, always. Never let the Sheet coerce an id to a number.
    if (String(values[i][0]) === ref) return i + 2;
  }
  return -1;
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(
    ContentService.MimeType.JSON,
  );
}

/**
 * Run this once from the editor to create the header row and approve the
 * authorization prompt. Delete the test row afterwards.
 */
function testAppend() {
  var secret = PropertiesService.getScriptProperties().getProperty('SHARED_SECRET');
  if (!secret) throw new Error('Set SHARED_SECRET in Script Properties first.');
  var res = doPost({
    postData: {
      contents: JSON.stringify({
        secret: secret,
        name: 'TEST ROW, delete me',
        email: 'test@example.invalid',
        phone: '',
        message: 'Written by testAppend()',
        detail: '',
        sourceTag: 'Colon - General Question [local]',
        deployment: 'local',
        route: '/contact',
        receivedAt: new Date().toISOString(),
        ip: '127.0.0.1',
        userAgent: 'apps-script-test',
      }),
    },
  });
  Logger.log(res.getContent());
}

/**
 * Optional. Run once to get an email the moment a row lands, as a belt to the
 * site's own notification sink. Set NOTIFY_EMAIL in Script Properties first.
 */
function notifyOnNewLead_(body) {
  var to = PropertiesService.getScriptProperties().getProperty('NOTIFY_EMAIL');
  if (!to) return;
  MailApp.sendEmail({
    to: to,
    subject:
      (body.deployment && body.deployment !== 'production' ? '[' + body.deployment + '] ' : '') +
      'New lead: ' +
      (body.sourceTag || 'unknown source'),
    body: [
      'Name:   ' + (body.name || ''),
      'Email:  ' + (body.email || ''),
      'Phone:  ' + (body.phone || '(not given)'),
      'Source: ' + (body.sourceTag || ''),
      'Page:   ' + (body.route || ''),
      'Env:    ' + (body.deployment || 'unknown'),
      '',
      body.detail || '',
      body.message || '',
    ].join('\n'),
  });
}
