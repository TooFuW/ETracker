# EmailTracker

A self-hosted email tracking tool. Embed invisible 1×1 pixels in your emails and know exactly when they are opened - including the email client, IP address, country, and language of the opener.

---

## How it works

1. **Generate a pixel** - the server creates a unique tracking URL tied to a label of your choice.
2. **Embed it** - paste the `<img>` tag into your email's HTML body. It is invisible to the recipient.
3. **Track opens** - every time the email is opened and the image loads, the server records the full open event: timestamp, IP address, email client, country, city, and language.
4. **Manage from the extension** - the Chrome extension lets you create pixels, monitor their stats, and delete them directly from your browser.

---

## Project structure

```
EmailTracker/
├── server/                  # Node.js / Express tracking server
│   ├── server.js
│   ├── pixel.gif            # 1×1 transparent GIF served as the pixel
│   ├── .env                 # Environment variables (not committed)
│   └── .env.example         # Template to copy from
└── extension/               # Chrome extension (Manifest V3)
    ├── manifest.json
    ├── content/
    │   └── content.js       # Content script injected into ProtonMail and Gmail composers
    ├── options/             # Settings page (server URL and API key, stored via chrome.storage)
    │   ├── options.html
    │   ├── options.css
    │   └── options.js
    └── popup/
        ├── popup.html
        ├── popup.css
        └── popup.js
```

---

## Server

### Prerequisites

- Node.js 18+

### Setup

```bash
cd server
npm install
```

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

```env
API_KEY=your-secret-api-key
SERVER_DOMAIN=https://your-domain.com
```

### Start

```bash
npm start
# Listening on http://localhost:3000
```

### API

All admin routes require the header `X-API-Key: <your key>`.

| Method   | Route                  | Auth | Description                               |
|----------|------------------------|------|-------------------------------------------|
| `GET`    | `/pixel/:id`           | No   | Serve the tracking pixel (records a read) |
| `GET`    | `/pixels`              | Yes  | List all pixels with their stats          |
| `POST`   | `/pixels`              | Yes  | Create a new pixel `{ "label": "..." }`   |
| `GET`    | `/pixels/:id/reads`    | Yes  | List all open events for a pixel          |
| `DELETE` | `/pixels/:id`          | Yes  | Delete a pixel and all its open history   |

**Create a pixel - example response:**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "url": "https://your-domain.com/pixel/550e8400-e29b-41d4-a716-446655440000"
}
```

**Pixel object:**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "label": "Invoice email - John",
  "created_at": "2026-04-16T10:00:00.000Z",
  "read_count": 3,
  "last_read_at": "2026-04-16T14:32:11.000Z"
}
```

**Open event object (`/pixels/:id/reads`):**

```json
{
  "id": 42,
  "read_at": "2026-04-16T14:32:11.000Z",
  "ip": "66.249.64.1",
  "user_agent": "Mozilla/5.0 (compatible; GoogleImageProxy)",
  "accept_language": "fr-FR,fr;q=0.9",
  "country": "US",
  "city": "Mountain View"
}
```

> Note: most major email clients (Gmail, Apple Mail, Yahoo) proxy images through their own servers. The IP and country will reflect the proxy, not the recipient's real location. The `user_agent` field still reliably identifies which email client was used.

### Security

- Rate limiting: 200 req / 15 min globally, 30 req / 15 min on the public pixel route.
- HTTP security headers via [Helmet](https://helmetjs.github.io/).
- Request body capped at 10 KB.
- Admin routes protected by API key.

---

## Chrome Extension

### Installation

1. Open `chrome://extensions` in Chrome.
2. Enable **Developer mode** (top right).
3. Click **Load unpacked** and select the `extension/` folder.

### Setup

Click the **Settings** button in the popup (or right-click the extension icon > Options) and fill in your server URL and API key. They are stored locally via `chrome.storage.local`, not synced or committed anywhere.

### Usage

#### Popup

Click the **EmailTracker** icon in your toolbar to open the popup.

- **Create** - enter a label and generate a new tracking pixel. The embed URL is ready to paste into your email.
- **View** - see all your pixels: label, creation date, open count, and last open time. Click a pixel to see the full open history with IP, country, email client, and language for each event.
- **Delete** - remove a pixel and its entire open history.

![Extension popup](https://raw.githubusercontent.com/TooFuW/emailtracker/main/Extension_popup.png)

#### Composer integration (ProtonMail and Gmail)

When composing an email on [mail.proton.me](https://mail.proton.me) or [mail.google.com](https://mail.google.com), a **Pixel Label** input and a **Create and insert pixel** button are automatically injected into the composer header. Fill in the label and click the button - the pixel is created on the server and inserted invisibly at the end of the email body in one click.

![ProtonMail integration](https://raw.githubusercontent.com/TooFuW/emailtracker/main/Protonmail_integration.png)

*Button injected into the ProtonMail composer*

![Gmail integration](https://raw.githubusercontent.com/TooFuW/emailtracker/main/Gmail_integration.png)

*Button injected into the Gmail composer*

> The extension communicates with your self-hosted server using the same API key configured in `.env`, entered in the extension's Settings page.

### ProtonMail and HTTPS

ProtonMail proxies all remote images through its own servers and **requires HTTPS**. If your server only exposes HTTP, images will not load for ProtonMail recipients (even when they allow remote content).

Even for other recipients, serving the pixel over HTTPS is strongly recommended: some email clients and security gateways block or silently drop HTTP images depending on their privacy settings, regardless of whether the sender uses ProtonMail or Gmail.

To support ProtonMail tracking you must serve the pixel over HTTPS. If you have a domain, the recommended setup is a TLS certificate managed by [Let's Encrypt / certbot](https://certbot.eff.org/) behind an Nginx reverse proxy.

If you do not have a domain or certificate, you can expose your local server through an SSH tunnel service such as [Serveo](https://serveo.net/), which gives you an HTTPS URL with no installation required:

```bash
autossh -M 0 -o "ServerAliveInterval 30" -o "ServerAliveCountMax 3" -R some-subdomain:80:localhost:3000 serveo.net
# Forwarding HTTP traffic from https://some-subdomain.serveo.net
```

> autossh keeps the SSH tunnel open, preventing Serveo from shutting it down after a period of inactivity.

Set `SERVER_DOMAIN` in your `.env` (and the server URL in the extension's Settings page) to the HTTPS URL provided by the tunnel.

---

## License

MIT
