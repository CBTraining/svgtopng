const puppeteer = require('puppeteer');
const http = require('http');
const handler = require('serve-handler');

const server = http.createServer((request, response) => {
  // Strip /webtools/ prefix for local serving
  if (request.url.startsWith('/webtools/')) {
    request.url = request.url.replace('/webtools', '');
  }
  return handler(request, response, { public: 'dist' });
});

server.listen(5000, async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', error => console.log('PAGE ERROR:', error.message));
  await page.goto('http://localhost:5000/webtools/', { waitUntil: 'networkidle0' });
  await browser.close();
  server.close();
  process.exit(0);
});
