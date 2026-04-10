require('dotenv').config();

const express = require('express');
const morgan = require('morgan');
const { chromium } = require('playwright');
const path = require('path');
const os = require('os');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(morgan('common'));

// Buat browser instance
let browser;

const launchBrowser = async () => {
  browser = await chromium.launch(); // Browser headless
}

launchBrowser();

async function fetchCount() {
  try {
    return (await axios.get("https://api.counterapi.dev/v1/raffxs/brat/up")).data?.count || 0
  } catch {
    return 0
  }
}

app.use('*', async (req, res) => {
  const text = req.query.text;
  const background = req.query.background;
  const color = req.query.color;
  
  if (!text) {
    const hitCount = await fetchCount();
    // Kalau gak ada text, tampilkan UI Web (bukan JSON)
    return res.send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Brat Generator API</title>
          <style>
              body { font-family: system-ui, -apple-system, sans-serif; background: #0f0f0f; color: #fff; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 20px; }
              .container { background: rgba(255, 255, 255, 0.05); padding: 2rem; border-radius: 16px; backdrop-filter: blur(12px); border: 1px solid rgba(255, 255, 255, 0.1); width: 100%; max-width: 420px; box-shadow: 0 4px 30px rgba(0, 0, 0, 0.5); }
              h1 { margin-top: 0; font-size: 1.5rem; text-align: center; letter-spacing: -0.5px; }
              .stats { text-align: center; font-size: 0.8rem; color: #888; margin-bottom: 1.5rem; }
              .form-group { margin-bottom: 1rem; }
              label { display: block; margin-bottom: 0.5rem; font-size: 0.85rem; color: #ccc; }
              input[type="text"] { width: 100%; padding: 0.8rem; border-radius: 8px; border: 1px solid #333; background: #1a1a1a; color: #fff; box-sizing: border-box; outline: none; transition: border 0.2s; }
              input[type="text"]:focus { border-color: #666; }
              .color-inputs { display: flex; gap: 1rem; }
              .color-inputs .form-group { flex: 1; }
              input[type="color"] { width: 100%; height: 40px; padding: 0.2rem; border-radius: 8px; border: 1px solid #333; background: #1a1a1a; cursor: pointer; }
              button { width: 100%; padding: 0.9rem; background: #fff; color: #000; border: none; border-radius: 8px; font-weight: 600; font-size: 1rem; cursor: pointer; margin-top: 0.5rem; transition: background 0.2s; }
              button:hover { background: #e0e0e0; }
              .result-container { margin-top: 2rem; text-align: center; min-height: 100px; display: flex; flex-direction: column; align-items: center; justify-content: center; }
              #resultImg { max-width: 100%; border-radius: 12px; display: none; box-shadow: 0 4px 20px rgba(0,0,0,0.3); }
              .loader { display: none; color: #888; font-size: 0.9rem; }
          </style>
      </head>
      <body>
          <div class="container">
              <h1>Brat Generator</h1>
              <div class="stats">Total Hits: ${hitCount}</div>
              
              <form id="generatorForm">
                  <div class="form-group">
                      <label>Text</label>
                      <input type="text" id="inputText" placeholder="Type something..." required>
                  </div>
                  <div class="color-inputs">
                      <div class="form-group">
                          <label>Background (Hex)</label>
                          <input type="color" id="inputBg" value="#ffffff">
                      </div>
                      <div class="form-group">
                          <label>Text Color (Hex)</label>
                          <input type="color" id="inputColor" value="#000000">
                      </div>
                  </div>
                  <button type="submit">Generate Image</button>
              </form>

              <div class="result-container">
                  <div class="loader" id="loader">Generating your brat image...</div>
                  <img id="resultImg" alt="Result">
              </div>
          </div>

          <script>
              document.getElementById('generatorForm').addEventListener('submit', (e) => {
                  e.preventDefault();
                  
                  const text = document.getElementById('inputText').value;
                  const bg = document.getElementById('inputBg').value;
                  const color = document.getElementById('inputColor').value;
                  
                  const img = document.getElementById('resultImg');
                  const loader = document.getElementById('loader');

                  // Sembunyikan gambar lama, tampilkan loading
                  img.style.display = 'none';
                  loader.style.display = 'block';

                  // Buat URL endpoint API
                  const url = \`/?text=\${encodeURIComponent(text)}&background=\${encodeURIComponent(bg)}&color=\${encodeURIComponent(color)}\`;

                  // Loading selesai saat gambar berhasil dimuat
                  img.onload = () => {
                      loader.style.display = 'none';
                      img.style.display = 'block';
                  };
                  
                  img.onerror = () => {
                      loader.style.display = 'none';
                      alert('Gagal nge-generate gambar. Cek server log kamu.');
                  };

                  // Trigger request ke Express Playwright kamu
                  img.src = url;
              });
          </script>
      </body>
      </html>
    `);
  }

  // === Kalau parameter text ada, lari ke fungsi generator lama ===
  if (!browser) {
    await launchBrowser();
  }
  const context = await browser.newContext({
    viewport: {
      width: 1536,
      height: 695
    }
  });
  const page = await context.newPage();

  const filePath = path.join(__dirname, './site/index.html');

  await page.goto(`file://${filePath}`);
  await page.click('#toggleButtonWhite');
  await page.click('#textOverlay');
  await page.click('#textInput');
  await page.fill('#textInput', text);

  await page.evaluate((data) => {
    if (data.background) {
      $('.node__content.clearfix').css('background-color', data.background);
    }
    if (data.color) {
      $('.textFitted').css('color', data.color);
    }
  }, { background, color });

  const element = await page.$('#textOverlay');
  const box = await element.boundingBox();

  res.set('Content-Type', 'image/png');
  res.end(await page.screenshot({
    clip: {
      x: box.x,
      y: box.y,
      width: 500,
      height: 500
    }
  }));
  await context.close();
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

// Menangani penutupan server
const closeBrowser = async () => {
  if (browser) {
    console.log('Closing browser...');
    await browser.close();
    console.log('Browser closed');
  }
};

process.on('SIGINT', async () => {
  console.log('SIGINT received');
  await closeBrowser();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('SIGTERM received');
  await closeBrowser();
  process.exit(0);
});

process.on('exit', async () => {
  console.log('Process exiting');
  await closeBrowser();
});
