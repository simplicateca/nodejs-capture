# NodeJS Screenshot Utility

## Setup

### Chromium Browser Installation

https://ploi.io/documentation/server/how-to-install-puppeteer-on-ubuntu

```bash
sudo apt-get install chromium-browser

sudo apt-get install libx11-xcb1 libxcomposite1 libasound2 libatk1.0-0 libatk-bridge2.0-0 libcairo2 libcups2 libdbus-1-3 libexpat1 libfontconfig1 libgbm1 libgcc1 libglib2.0-0 libgtk-3-0 libnspr4 libpango-1.0-0 libpangocairo-1.0-0 libstdc++6 libx11-6 libx11-xcb1 libxcb1 libxcomposite1 libxcursor1 libxdamage1 libxext6 libxfixes3 libxi6 libxrandr2 libxrender1 libxss1 libxtst6
```

For **Ubuntu 24.04+** you may need to replace `libasound` with `libasound2t64`.

### JavaScript Dependencies

```bash
npm install
node index.js
```

### Environment Variables (.env file)

```env
API_TOKEN=your_secret_token_here
PORT=3000
```

### Ploi Deployment Script

```bash
cd {SITE_DIRECTORY}
cd ..
rm -rf {SITE_DIRECTORY}
git clone https://github.com/simplicateca/nodejs-capture {SITE_DIRECTORY}
cd {SITE_DIRECTORY}
echo -e "PORT=3000\nAPI_TOKEN=$(openssl rand -base64 24)" > .env
npm ci

echo "🚀 Application deployed!"
```

## How to Use

### Screenshot

```bash
curl -X POST http://localhost:3000/screenshot \
   -H "Content-Type: application/json" \
   -H "Authorization: Bearer your_secret_token_here" \
   -d '{ "url": "https://simplicate.ca" }' \
   --output screenshot.png
```

```bash
curl -X POST http://localhost:3000/screenshot \
   -H "Content-Type: application/json" \
   -H "Authorization: Bearer your_secret_token_here" \
   -d '{ "url": "https://simplicate.ca", "options" : { "viewport": { "width": 1024, "height": 768 } }  }' \
   --output screenshot.png
```

### Webpage to PDF

```bash
curl -X POST http://localhost:3000/pdf \
   -H "Content-Type: application/json" \
   -H "Authorization: Bearer your_secret_token_here" \
   -d '{"url": "https://simplicate.ca"}' \
   --output document.pdf
```

### Screencast (Webm Video)

**Notes:** This feature requires `ffmpeg` be installed on the server.

```bash
curl -X POST http://localhost:3000/screencast \
   -H "Content-Type: application/json" \
   -H "Authorization: Bearer your_secret_token_here" \
   -d '{"url": "https://simplicate.ca"}' \
   --output screencast.webm
```
