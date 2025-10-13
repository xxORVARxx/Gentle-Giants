// First install dependencies: npm install express axios cheerio

const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');

const app = express();
const PORT = 3000;

// Route to scrape tide data and road conditions
app.get('/tides', async (req, res) => {
  try {
    // Fetch the tide forecast webpage
    const tideResponse = await axios.get('https://www.tide-forecast.com/locations/Husavik-Iceland/tides/latest', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    // Fetch the road conditions webpage
    const roadResponse = await axios.get('https://www.vegagerdin.is/vs/Today.aspx', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    // Load tide HTML into cheerio
    const $tide = cheerio.load(tideResponse.data);
    const tideHeaderToday = $tide('.tide-header-today.tide-header__card').html();
    
    // Load road conditions HTML into cheerio
    const $road = cheerio.load(roadResponse.data);
    const roadImg = $road('#ctl00_ContentPlaceHolder1_imgToday');
    const roadImgSrc = roadImg.attr('src');
    
    // Construct full image URL (relative to base URL)
    const roadImageUrl = roadImgSrc ? `https://www.vegagerdin.is/vs/${roadImgSrc}` : '';
    
    // Send HTML response with the extracted tide data
    res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Gentle Giants - Information Dashboard</title>
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            
            body { 
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              overflow: hidden;
              height: 100vh;
              display: flex;
              flex-direction: column;
            }
            
            /* Title Bar */
            .title-bar {
              background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
              color: white;
              padding: 20px 40px;
              display: flex;
              justify-content: space-between;
              align-items: center;
              box-shadow: 0 4px 20px rgba(0,0,0,0.3);
              flex-shrink: 0;
            }
            
            .company-name {
              font-size: 2.5em;
              font-weight: bold;
              text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
              letter-spacing: 2px;
            }
            
            .clock {
              font-size: 2.5em;
              font-weight: 300;
              font-family: 'Courier New', monospace;
              text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
            }
            
            /* Grid Container */
            .grid-container {
              display: grid;
              grid-template-columns: 1fr 1fr;
              grid-template-rows: 1fr 1fr;
              gap: 20px;
              padding: 20px;
              flex: 1;
              min-height: 0;
            }
            
            .grid-item {
              background: white;
              border-radius: 15px;
              padding: 20px;
              box-shadow: 0 8px 32px rgba(0,0,0,0.2);
              display: flex;
              flex-direction: column;
              overflow: hidden;
            }
            
            .grid-item h2 {
              color: #1e3c72;
              font-size: 1.5em;
              margin-bottom: 15px;
              padding-bottom: 10px;
              border-bottom: 3px solid #667eea;
              flex-shrink: 0;
            }
            
            .grid-item-content {
              flex: 1;
              overflow: auto;
              display: flex;
              flex-direction: column;
            }
            
            /* Tide Data Styling */
            .tide-data {
              flex: 1;
            }
            
            /* Custom styling for scraped tide content */
            .tide-data h3 {
              font-size: 1.1em;
              color: #2c3e50;
              text-align: center;
              margin-bottom: 15px;
              font-weight: 600;
            }
            
            .tide-data .tide-header-today__tide-times--nextrow {
              display: block;
              margin-top: 5px;
            }
            
            .tide-data table {
              width: 100%;
              border-collapse: separate;
              border-spacing: 0;
              margin: 10px 0;
            }
            
            .tide-data table th {
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              padding: 12px 8px;
              text-align: left;
              font-weight: 600;
              font-size: 0.95em;
              border: none;
            }
            
            .tide-data table th:first-child {
              border-radius: 8px 0 0 0;
            }
            
            .tide-data table th:last-child {
              border-radius: 0 8px 0 0;
            }
            
            .tide-data table td {
              padding: 12px 8px;
              border-bottom: 1px solid #e0e0e0;
              font-size: 0.95em;
            }
            
            .tide-data table tr:last-child td {
              border-bottom: none;
            }
            
            .tide-data table tr:nth-child(even) {
              background-color: #f8f9fa;
            }
            
            .tide-data table tr:hover {
              background-color: #e8f4f8;
              transition: background-color 0.2s;
            }
            
            .tide-data table td:first-child {
              font-weight: 600;
              color: #1e3c72;
            }
            
            .tide-data table b {
              color: #2c3e50;
              font-size: 1.05em;
            }
            
            .tide-day-tides__secondary {
              color: #7f8c8d;
              font-size: 0.85em;
              display: block;
              margin-top: 2px;
            }
            
            .tide-day-tides__sub-header {
              display: block;
              font-size: 0.8em;
              font-weight: 400;
              opacity: 0.9;
            }
            
            .tide-day-tides__icon {
              vertical-align: middle;
              margin-left: 5px;
            }
            
            .tide-header-today__datum {
              margin-top: 15px;
              padding: 10px;
              background: #e8f4f8;
              border-radius: 6px;
              font-size: 0.85em;
            }
            
            .tide-header-today__datum-source {
              color: #34495e;
            }
            
            .tide-header-today__datum-source b {
              color: #1e3c72;
            }
            
            .not-in-print {
              display: block;
            }
            
            /* Road Conditions Image */
            .road-image {
              width: 100%;
              height: 100%;
              object-fit: contain;
              border-radius: 8px;
            }
            
            /* Placeholder styling */
            .placeholder {
              display: flex;
              align-items: center;
              justify-content: center;
              color: #999;
              font-size: 1.2em;
              flex: 1;
            }
            
            /* Auto refresh indicator */
            .refresh-indicator {
              position: fixed;
              bottom: 10px;
              right: 10px;
              background: rgba(255,255,255,0.9);
              padding: 8px 15px;
              border-radius: 20px;
              font-size: 0.9em;
              color: #1e3c72;
              box-shadow: 0 2px 10px rgba(0,0,0,0.2);
            }
            
            .refresh-dot {
              display: inline-block;
              width: 8px;
              height: 8px;
              background: #27ae60;
              border-radius: 50%;
              margin-right: 8px;
              animation: pulse 2s infinite;
            }
            
            @keyframes pulse {
              0%, 100% { opacity: 1; }
              50% { opacity: 0.3; }
            }
          </style>
          <script>
            // Update clock every second
            function updateClock() {
              const now = new Date();
              const hours = String(now.getHours()).padStart(2, '0');
              const minutes = String(now.getMinutes()).padStart(2, '0');
              const seconds = String(now.getSeconds()).padStart(2, '0');
              document.getElementById('clock').textContent = hours + ':' + minutes + ':' + seconds;
            }
            
            // Update countdown
            let seconds = 30;
            function updateCountdown() {
              seconds--;
              if (seconds >= 0) {
                document.getElementById('countdown').textContent = seconds;
              }
              if (seconds === 0) {
                location.reload();
              }
            }
            
            // Initialize on page load
            window.addEventListener('DOMContentLoaded', () => {
              updateClock();
              setInterval(updateClock, 1000);
              setInterval(updateCountdown, 1000);
            });
          </script>
        </head>
        <body>
          <!-- Title Bar -->
          <div class="title-bar">
            <div class="company-name">🐋 GENTLE GIANTS</div>
            <div class="clock" id="clock">00:00:00</div>
          </div>
          
          <!-- Grid Container -->
          <div class="grid-container">
            <!-- Grid Item 1: Tide Forecast -->
            <div class="grid-item">
              <h2>🌊 Húsavík Tide Forecast</h2>
              <div class="grid-item-content">
                <div class="tide-data">
                  ${tideHeaderToday || '<div class="placeholder">No tide data available</div>'}
                </div>
              </div>
            </div>
            
            <!-- Grid Item 2: Sea Conditions -->
            <div class="grid-item">
              <h2>🚤 Iceland Sea Conditions</h2>
              <div class="grid-item-content">
                ${roadImageUrl ? `<img src="${roadImageUrl}" alt="Iceland Sea Conditions" class="road-image">` : '<div class="placeholder">Sea conditions image not available</div>'}
              </div>
            </div>
            
            <!-- Grid Item 3: Placeholder -->
            <div class="grid-item">
              <h2>📊 Additional Info</h2>
              <div class="grid-item-content">
                <div class="placeholder">Available for future content</div>
              </div>
            </div>
            
            <!-- Grid Item 4: Placeholder -->
            <div class="grid-item">
              <h2>📅 Weather Forecast</h2>
              <div class="grid-item-content">
                <div class="placeholder">Available for future content</div>
              </div>
            </div>
          </div>
          
          <!-- Refresh Indicator -->
          <div class="refresh-indicator">
            <span class="refresh-dot"></span>
            Auto-refresh in <span id="countdown">30</span>s
          </div>
        </body>
      </html>
    `);
  } catch (error) {
    res.status(500).send(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>Error - Gentle Giants Dashboard</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              display: flex;
              justify-content: center;
              align-items: center;
              height: 100vh;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              margin: 0;
            }
            .error-container {
              background: white;
              padding: 40px;
              border-radius: 15px;
              box-shadow: 0 8px 32px rgba(0,0,0,0.3);
              text-align: center;
            }
            h1 { color: #e74c3c; }
            a {
              display: inline-block;
              margin-top: 20px;
              padding: 10px 20px;
              background: #3498db;
              color: white;
              text-decoration: none;
              border-radius: 5px;
            }
          </style>
        </head>
        <body>
          <div class="error-container">
            <h1>⚠️ Error Loading Dashboard</h1>
            <p>${error.message}</p>
            <a href="/tides">Retry</a>
          </div>
        </body>
      </html>
    `);
  }
});

// Home route
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Tide Scraper</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            max-width: 600px;
            margin: 100px auto;
            text-align: center;
          }
          .link-btn {
            display: inline-block;
            margin-top: 20px;
            padding: 15px 30px;
            background: #3498db;
            color: white;
            text-decoration: none;
            border-radius: 5px;
            font-size: 18px;
          }
          .link-btn:hover {
            background: #2980b9;
          }
        </style>
      </head>
      <body>
        <h1>🌊 Húsavík Tide Scraper</h1>
        <p>Get the latest tide information for Húsavík, Iceland</p>
        <a href="/tides" class="link-btn">View Tide Forecast</a>
      </body>
    </html>
  `);
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`View tides at http://localhost:${PORT}/tides`);
});