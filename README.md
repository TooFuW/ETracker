# EmailTracker

A self-hosted email tracking tool. Embed invisible 1×1 pixels in your emails and know exactly when (and how many times) they are opened.

---

## How it works

1. **Generate a pixel** - the server creates a unique tracking URL tied to a label of your choice.
2. **Embed it** - paste the `<img>` tag into your email's HTML body. It is invisible to the recipient.
3. **Track opens** - every time the email is opened and the image loads, the server increments the read counter and records the timestamp.
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
    ├── config.js            # Extension config (not committed)
    ├── config.example.js    # Template to copy from
    ├── content/
    │   └── content.js       # Content script injected into ProtonMail composer
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

| Method   | Route           | Auth | Description                               |
|----------|-----------------|------|-------------------------------------------|
| `GET`    | `/pixel/:id`    | No   | Serve the tracking pixel (records a read) |
| `GET`    | `/pixels`       | Yes  | List all pixels with their stats          |
| `POST`   | `/pixels`       | Yes  | Create a new pixel `{ "label": "..." }`   |
| `DELETE` | `/pixels/:id`   | Yes  | Delete a pixel                            |

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

### Security

- Rate limiting: 200 req / 15 min globally, 30 req / 15 min on the public pixel route.
- HTTP security headers via [Helmet](https://helmetjs.github.io/).
- Request body capped at 10 KB.
- Admin routes protected by API key.

---

## Chrome Extension

### Setup

Copy `config.example.js` to `config.js` and fill in your values:

```bash
cp config.example.js config.js
```

```js
const CONFIG = {
  API_URL: 'https://your-domain.com',
  API_KEY: 'your-secret-api-key'
};
```

### Installation

1. Open `chrome://extensions` in Chrome.
2. Enable **Developer mode** (top right).
3. Click **Load unpacked** and select the `extension/` folder.

### Usage

#### Popup

Click the **EmailTracker** icon in your toolbar to open the popup.

- **Create** - enter a label and generate a new tracking pixel. The embed URL is ready to paste into your email.
- **View** - see all your pixels: label, creation date, open count, and last open time.
- **Delete** - remove a pixel you no longer need.

#### ProtonMail composer integration

When composing an email on [mail.proton.me](https://mail.proton.me), a **Pixel Label** input and a **Create and insert pixel** button are automatically injected into the composer header. Fill in the label and click the button - the pixel is created on the server and inserted invisibly at the end of the email body in one click.

> The extension communicates with your self-hosted server using the same API key configured in `.env`.

### ProtonMail and HTTPS

ProtonMail proxies all remote images through its own servers and **requires HTTPS**. If your server only exposes HTTP, images will not load for ProtonMail recipients (even when they allow remote content).

To support ProtonMail tracking you must serve the pixel over HTTPS. The recommended setup is a domain with a TLS certificate managed by [Let's Encrypt / certbot](https://certbot.eff.org/) behind an Nginx reverse proxy.

Note: because ProtonMail fetches images through its proxy, the IP recorded will be ProtonMail's server IP rather than the recipient's.

---

## License

MIT
