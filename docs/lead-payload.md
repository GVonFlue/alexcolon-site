# Lead payload contract

What this site sends when somebody converts, so a receiver can be written
against it without reading `lib/leads.ts`.

Everything below is stable. If any of it changes, this file changes in the same
commit, and the version line moves.

**Contract version: 1.1** (v1.0 had no `deployment` field and used a single
source tag for the whole assistant.)

---

## The shape of a lead

One visitor action produces one lead, which is fanned out to up to four sinks.
Every sink gets the same underlying facts in its own shape. There is one code
path, `captureLead`, and both capture surfaces (the forms and the assistant) go
through it.

| Field | Type | Always present | What it is |
| --- | --- | --- | --- |
| `name` | string, 1 to 120 chars | yes | As the visitor typed it. Never parsed into parts. |
| `email` | string, valid email, max 200 | yes | See the note on assistant leads below. |
| `phone` | string, max 40 | no, may be `""` | Free text. Not normalised, not validated as a number. |
| `message` | string, max 4000 | no, may be `""` | What the visitor wrote. |
| `detail` | string, max 500 | no, may be `""` | One extra free text field some forms ask for, usually a property address. |
| `sourceTag` | string | yes | Which surface produced it. See below. |
| `route` | string, max 120 | yes | The path the visitor was on. |
| `externalRef` | string, max 120 | no | Present on assistant leads. See below. |
| `receivedAt` | ISO 8601 string | yes | Server time the request was accepted. |
| `ip` | string | yes | May be empty behind some proxies. |
| `userAgent` | string | yes | May be empty. |
| `deployment` | `production` \| `preview` \| `development` \| `local` | yes | Which deployment sent it. |

### Two rules that matter more than the rest

**IDs are strings and are never parsed.** `externalRef` is a string in every
payload and must be read as one. Several real estate CRMs use 64-bit integer
IDs, and `Number("9007199254740993")` returns `9007199254740992`, which is a
different record. `lib/leads.ts` throws rather than write an ID that arrived as
a number, and `tests/leads.test.mjs` asserts a 64-bit ID survives the round trip
by checking the raw request body, not the parsed object, because parsing is
exactly the step that would corrupt it.

**A downstream failure is never surfaced to the visitor.** Every sink is
independent. If a receiver returns a non-2xx, or times out at 8 seconds, the
visitor still sees success, the other sinks still receive the lead, and the
failure is logged. Do not design a receiver that expects the site to retry: it
does not. If every sink fails, the full payload goes to the site's log in one
line tagged `[lead][RECOVERABLE]` so it can be replayed by hand.

---

## Source tags

A tag names the surface that produced the lead. The site rejects any tag not on
its own allowlist, so a tag cannot be spoofed by posting a made-up one.

The form tags, one per lead magnet:

```
Colon - Buyer Guide Request
Colon - Home Valuation Request
Colon - VA Checklist Request
Colon - Investment Analysis Request
Colon - General Question
```

The assistant tags, one per route:

```
Colon - Lark Assistant /
Colon - Lark Assistant /buy
Colon - Lark Assistant /sell
Colon - Lark Assistant /veterans
Colon - Lark Assistant /investors
Colon - Lark Assistant /areas
Colon - Lark Assistant /about
Colon - Lark Assistant /contact
```

### The environment marker

On any deployment that is not production, the tag arrives with the deployment
appended in square brackets:

```
Colon - General Question [preview]
Colon - Lark Assistant /buy [local]
```

Production tags carry no marker at all. The `deployment` field carries the same
information as its own value, and **that is the field to filter on**: parsing
the marker back out of the tag works right up until somebody renames a tag.

This exists because a preview deployment is a real, working site with real,
working forms, and without the marker every lead generated while clicking
around one lands in the live Sheet indistinguishable from a genuine lead. That
has happened before.

The marker is added server side, after the tag has been validated, so a client
cannot pass itself off as production by sending an undecorated tag, and cannot
get a decorated one past the allowlist either.

---

## Assistant leads

Two things differ.

**`email` may be a placeholder.** The assistant captures on a name plus *either*
an email or a phone number, because demanding both in a conversation is an
intake form wearing a chat interface. When only a phone number was given, the
email field arrives as:

```
<sessionId>@no-email-given.invalid
```

`.invalid` is reserved by RFC 2606 and can never resolve. **Do not send mail to
an address ending in `@no-email-given.invalid`.** Treat it as absent and use the
phone number.

**`externalRef` is present and is stable per conversation.** It has the form
`chat:<sessionId>`. The same visitor sending a second message in the same
conversation produces the same `externalRef`, and the receiver is expected to
**update the existing record rather than create a second one**. A conversation
that gives a name in one message and a phone number three messages later must
end as one lead, not two half-filled ones.

The Sheet receiver in `deploy/leads-apps-script.gs` implements this as a merge:
a field that arrives empty does not blank out a value already recorded, and
`receivedAt` keeps its original value while `updatedAt` moves.

---

## What each sink receives

### Sheet, `LEAD_SHEET_WEBHOOK_URL`

`POST`, `content-type: application/json`. The source of truth, and the highest
priority sink.

```json
{
  "secret": "<LEAD_SHEET_SHARED_SECRET>",
  "name": "Pat Rivera",
  "email": "pat@example.org",
  "phone": "3165551234",
  "message": "Looking in Derby, not in a hurry.",
  "detail": "",
  "sourceTag": "Colon - General Question",
  "route": "/contact",
  "externalRef": "chat:9f3c...",
  "receivedAt": "2026-09-02T18:04:11.482Z",
  "ip": "203.0.113.7",
  "userAgent": "Mozilla/5.0 ...",
  "deployment": "production"
}
```

`secret` is compared against the `SHARED_SECRET` script property and the request
is rejected if it does not match. The secret is never in the repo.

### CRM, `CRM_LEAD_ENDPOINT`

`POST`, with `authorization: Bearer <CRM_API_KEY>`. Snake case, because that is
what the ProyTech CRM ingest expects.

```json
{
  "full_name": "Pat Rivera",
  "email": "pat@example.org",
  "phone": "3165551234",
  "notes": "Looking in Derby, not in a hurry.",
  "source": "Colon - General Question",
  "landing_route": "/contact",
  "external_ref": "chat:9f3c...",
  "received_at": "2026-09-02T18:04:11.482Z",
  "deployment": "production"
}
```

`phone`, `notes` and `external_ref` are `null` rather than `""` when absent.
`notes` joins `message` and `detail` with a blank line between them.

`source` must be stored. Most CRMs default an unattributed API lead to "Other",
which destroys the reporting that proves the site is working at the sixty day
mark.

### GoHighLevel, `GHL_WEBHOOK_URL`

```json
{
  "locationId": "<GHL_LOCATION_ID>",
  "name": "Pat Rivera",
  "email": "pat@example.org",
  "phone": "3165551234",
  "source": "Colon - General Question",
  "customField": { "landing_route": "/contact", "detail": "" },
  "receivedAt": "2026-09-02T18:04:11.482Z"
}
```

### Notification, `NOTIFY_EMAIL_ENDPOINT`

```json
{
  "to": "<NOTIFY_EMAIL_TO>",
  "subject": "New lead: Colon - General Question",
  "text": "Name:   Pat Rivera\nEmail:  pat@example.org\n..."
}
```

---

## Behaviour a receiver can rely on

- **Timeout.** The site abandons a sink after 8 seconds and treats it as failed.
  A receiver that takes longer will be reported as down even if it eventually
  succeeds, and the lead may then be delivered twice if a visitor resubmits.
  Make the write idempotent on `externalRef` where one is present.
- **No retries.** There is no queue and no backoff.
- **Ordering.** Sinks are dispatched together, not in sequence. Do not assume
  the Sheet has the row before the CRM call arrives.
- **Spam controls happen before any of this.** A honeypot field and a three
  second minimum time-on-form are applied at the API route. A submission that
  fails either is dropped silently and never reaches a sink, and the bot is told
  it succeeded. No sink ever sees them.
- **Validation happens before any of this.** A payload that fails the schema
  returns 422 and reaches no sink.

---

## Things deliberately not in the payload

- **No lead score, no grade, no priority.** The site has no basis for one.
- **No inferred intent or budget.** Nothing is derived from what the visitor
  typed; `message` is passed through verbatim.
- **No page view history, no session replay, no fingerprint.** `route` is the
  one page the lead came from.
- **Nothing about the property beyond what the visitor typed** into `detail`.
