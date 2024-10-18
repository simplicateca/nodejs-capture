# NodeJS Screenshot Utility

## Installation

```bash
npm install
node index.js
```

### Environment Variables (.env file)

```env
API_TOKEN=your_secret_token_here
PORT=3000
```

## Usage

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
