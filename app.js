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

let browser;

const launchBrowser = async () => {
  browser = await chromium.launch(); // Browser headless
}

launchBrowser();

// Fungsi buat BACA data aja (gak nambah hit pas web di refresh)
async function getCount() {
  try {
    return (await axios.get("https://api.counterapi.dev/v1/raffxs/brat")).data?.count || 0;
  } catch {
    return 0;
  }
}

// Fungsi buat NAMBAH hit (cuma dipanggil pas sukses generate text)
async function upCount() {
  try {
    return (await axios.get("https://api.counterapi.dev/v1/raffxs/brat/up")).data?.count || 0;
  } catch {
    return 0;
  }
}

app.use('*', async (req, res) => {
  const text = req.query.text;
  const background = req.query.background;
  const color = req.query.color;
  
  if (!text) {
    // Panggil getCount (tanpa /up) biar refresh gak nambah hit
    const hitCount = await getCount();
    
    return res.send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Brat Generator API</title>
          <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
          <style>
              /* NPM Style Clean UX */
              body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Open Sans", "Helvetica Neue", sans-serif; background: #ffffff; color: #333; margin: 0; padding: 0; line-height: 1.6; }
              
              /* Header */
              header { background: #fff; border-bottom: 1px solid #e1e4e8; padding: 15px 20px; display: flex; align-items: center; box-shadow: 0 1px 3px rgba(0,0,0,0.04); }
              .header-logo { font-size: 20px; font-weight: 700; color: #cb3837; display: flex; align-items: center; gap: 10px; }
              .header-logo i { font-size: 24px; }
              .header-nav { margin-left: auto; font-size: 14px; font-weight: 600; color: #555; }

              /* Main Layout */
              .main-container { max-width: 1200px; margin: 0 auto; padding: 40px 20px; display: grid; grid-template-columns: 2fr 1fr; gap: 40px; }
              
              /* Left Column (Content) */
              .content-area { background: #fff; }
              .page-title { font-size: 2.5rem; margin-top: 0; margin-bottom: 5px; font-weight: 600; color: #24292e; }
              .page-subtitle { color: #586069; font-size: 1.1rem; margin-bottom: 30px; }
              
              .form-card { border: 1px solid #e1e4e8; border-radius: 6px; padding: 25px; margin-bottom: 30px; background: #fafbfc; }
              .form-group { margin-bottom: 20px; }
              label { display: block; margin-bottom: 8px; font-size: 14px; font-weight: 600; color: #24292e; }
              input[type="text"] { width: 100%; padding: 10px 12px; border-radius: 6px; border: 1px solid #e1e4e8; background: #fff; color: #24292e; box-sizing: border-box; outline: none; font-size: 14px; transition: border 0.2s, box-shadow 0.2s; }
              input[type="text"]:focus { border-color: #0366d6; box-shadow: 0 0 0 3px rgba(3, 102, 214, 0.3); }
              
              .color-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
              input[type="color"] { width: 100%; height: 42px; padding: 2px; border-radius: 6px; border: 1px solid #e1e4e8; background: #fff; cursor: pointer; }
              
              button.btn-primary { width: 100%; padding: 12px; background: #cb3837; color: #fff; border: none; border-radius: 6px; font-weight: 600; font-size: 15px; cursor: pointer; transition: background 0.2s; }
              button.btn-primary:hover { background: #b32f2e; }

              /* Result Area */
              .result-container { border: 1px solid #e1e4e8; border-radius: 6px; padding: 20px; text-align: center; min-height: 200px; display: flex; flex-direction: column; align-items: center; justify-content: center; background: #fff; }
              #resultImg { max-width: 100%; border-radius: 4px; display: none; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
              .loader { display: none; color: #586069; font-size: 14px; font-weight: 500; }
              .loader i { animation: spin 1s linear infinite; margin-right: 8px; }

              /* Right Column (Sidebar / Metadata) */
              .sidebar { border-left: 1px solid #e1e4e8; padding-left: 30px; }
              .sidebar-section { margin-bottom: 30px; }
              .sidebar-title { font-size: 16px; font-weight: 600; color: #24292e; border-bottom: 1px solid #e1e4e8; padding-bottom: 8px; margin-bottom: 15px; }
              
              .stat-box { font-size: 14px; color: #586069; display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
              .stat-box strong { color: #24292e; font-size: 18px; }
              .stat-box i { font-size: 20px; color: #cb3837; width: 24px; text-align: center; }

              .social-list { list-style: none; padding: 0; margin: 0; }
              .social-list li { margin-bottom: 10px; }
              .social-btn { display: flex; align-items: center; gap: 12px; padding: 10px 15px; border-radius: 6px; border: 1px solid #e1e4e8; color: #24292e; text-decoration: none; font-size: 14px; font-weight: 500; transition: all 0.2s; background: #fff; }
              .social-btn:hover { background: #f6f8fa; border-color: #d1d5da; }
              .social-btn i { font-size: 18px; width: 20px; text-align: center; }
              
              /* Brand Colors */
              .github i { color: #24292e; }
              .instagram i { color: #E1306C; }
              .tiktok i { color: #000000; }
              .whatsapp i { color: #25D366; }

              @keyframes spin { 100% { transform: rotate(360deg); } }

              /* Responsive */
              @media (max-width: 768px) {
                  .main-container { grid-template-columns: 1fr; }
                  .sidebar { border-left: none; padding-left: 0; border-top: 1px solid #e1e4e8; padding-top: 30px; }
              }
          </style>
      </head>
      <body>
          <header>
              <div class="header-logo"><i class="fa-solid fa-layer-group"></i> Brat API</div>
              <div class="header-nav">v1.0.0 • Public</div>
          </header>

          <div class="main-container">
              <div class="content-area">
                  <h1 class="page-title">Brat Generator</h1>
                  <div class="page-subtitle">A fast and simple API to generate brat text overlay images.</div>
                  
                  <div class="form-card">
                      <form id="generatorForm">
                          <div class="form-group">
                              <label for="inputText">Text Content</label>
                              <input type="text" id="inputText" placeholder="Enter your text here..." required>
                          </div>
                          <div class="color-grid form-group">
                              <div>
                                  <label for="inputBg">Background Color</label>
                                  <input type="color" id="inputBg" value="#ffffff">
                              </div>
                              <div>
                                  <label for="inputColor">Text Color</label>
                                  <input type="color" id="inputColor" value="#000000">
                              </div>
                          </div>
                          <button type="submit" class="btn-primary">Generate Image</button>
                      </form>
                  </div>

                  <div class="sidebar-title">Preview Result</div>
                  <div class="result-container">
                      <div class="loader" id="loader"><i class="fa-solid fa-circle-notch"></i> Processing image...</div>
                      <img id="resultImg" alt="Generated Brat Image">
                  </div>
              </div>

              <div class="sidebar">
                  <div class="sidebar-section">
                      <div class="sidebar-title">Statistics</div>
                      <div class="stat-box">
                          <i class="fa-solid fa-chart-line"></i>
                          <div>
                              <strong>${hitCount}</strong>
                              <div style="font-size: 12px">Total API Generated</div>
                          </div>
                      </div>
                  </div>

                  <div class="sidebar-section">
                      <div class="sidebar-title">Connect with Developer</div>
                      <ul class="social-list">
                          <li>
                              <a href="https://github.com/maultzy" target="_blank" class="social-btn github">
                                  <i class="fa-brands fa-github"></i> maultzy
                              </a>
                          </li>
                          <li>
                              <a href="https://instagram.com/username_kamu" target="_blank" class="social-btn instagram">
                                  <i class="fa-brands fa-instagram"></i> Instagram
                              </a>
                          </li>
                          <li>
                              <a href="https://tiktok.com/@username_kamu" target="_blank" class="social-btn tiktok">
                                  <i class="fa-brands fa-tiktok"></i> TikTok
                              </a>
                          </li>
                          <li>
                              <a href="https://wa.me/6281234567890" target="_blank" class="social-btn whatsapp">
                                  <i class="fa-brands fa-whatsapp"></i> Chat WhatsApp
                              </a>
                          </li>
                          <li>
                              <a href="https://whatsapp.com/channel/link_channel_kamu" target="_blank" class="social-btn whatsapp">
                                  <i class="fa-solid fa-bullhorn"></i> Channel WA
                              </a>
                          </li>
                      </ul>
                  </div>
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

                  img.style.display = 'none';
                  loader.style.display = 'block';

                  const url = \`/?text=\${encodeURIComponent(text)}&background=\${encodeURIComponent(bg)}&color=\${encodeURIComponent(color)}\`;

                  img.onload = () => {
                      loader.style.display = 'none';
                      img.style.display = 'block';
                  };
                  
                  img.onerror = () => {
                      loader.style.display = 'none';
                      alert('Gagal nge-generate gambar. Cek server log kamu.');
                  };

                  img.src = url;
              });
          </script>
      </body>
      </html>
    `);
  }

  // === PROSES GENERATE GAMBAR (HANYA JALAN JIKA ADA PARAMETER TEXT) ===
  
  // Karena ini valid generate (bukan refresh UI), kita up total hit-nya di background
  upCount();

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
