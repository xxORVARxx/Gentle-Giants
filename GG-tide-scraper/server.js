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
          <title>Húsavík Tide Information</title>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              max-width: 1000px; 
              margin: 50px auto;
              padding: 20px;
              background: #f5f5f5;
            }
            .container {
              background: white;
              padding: 30px;
              border-radius: 10px;
              box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            }
            h1 {
              color: #2c3e50;
              border-bottom: 3px solid #3498db;
              padding-bottom: 10px;
            }
            .tide-data {
              margin-top: 20px;
            }
            .refresh-btn {
              display: inline-block;
              margin-top: 20px;
              padding: 10px 20px;
              background: #3498db;
              color: white;
              text-decoration: none;
              border-radius: 5px;
            }
            .refresh-btn:hover {
              background: #2980b9;
            }
            .auto-refresh {
              color: #27ae60;
              font-size: 14px;
              margin-top: 10px;
            }
            .road-conditions {
              margin-top: 30px;
              padding-top: 30px;
              border-top: 3px solid #3498db;
            }
            .road-conditions h2 {
              color: #2c3e50;
            }
            .road-conditions img {
              width: 100%;
              max-width: 100%;
              height: auto;
              border-radius: 8px;
              box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            }
          </style>
          <script>
            // Auto-refresh every 30 seconds
            setTimeout(() => {
              location.reload();
            }, 30000);
            
            // Update countdown display
            let seconds = 30;
            setInterval(() => {
              seconds--;
              if (seconds >= 0) {
                document.getElementById('countdown').textContent = seconds;
              }
            }, 1000);
          </script>
        </head>
        <body>
          <div class="container">
            <h1>🌊 Húsavík Tide Forecast</h1>
            <div class="tide-data">
              ${tideHeaderToday || '<p>No tide data available</p>'}
            </div>
            <p class="auto-refresh">⏱️ Auto-refreshing in <span id="countdown">30</span> seconds...</p>
            <a href="/tides" class="refresh-btn">Refresh Now</a>
            
            <div class="road-conditions">
              <h2>🚤 Iceland Sea Conditions Today</h2>
              ${roadImageUrl ? `<img src="${roadImageUrl}" alt="Iceland Road Conditions Today">` : '<p>Road conditions image not available</p>'}
            </div>
          </div>
        </body>
      </html>
    `);
  } catch (error) {
    res.status(500).send(`
      <!DOCTYPE html>
      <html>
        <head><title>Error</title></head>
        <body>
          <h1>Error scraping tide data</h1>
          <p>${error.message}</p>
          <a href="/tides">Try again</a>
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