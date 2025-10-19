// First install dependencies: npm install express axios cheerio

const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');

const app = express();
const PORT = 3000;


async function f_fetchTideForecastFromWebpage() {

  function f_parseStrToDateObject(_date, _time) {
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    const dateMatch = _date.match(/\d+\s+\w+/);
    const [day, month] = dateMatch[0].split(' ');
    const monthIndex = monthNames.findIndex(m => m.startsWith(month));

    const [timeStr, period] = _time.split(' ');
    let [hours, minutes] = timeStr.split(':').map(Number);

    if (period === 'PM' && hours !== 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;

    const year = new Date().getFullYear();
    const dateObj = new Date(year, monthIndex, parseInt(day), hours, minutes);

    console.log(dateObj);
    return dateObj;
  }

  function f_extractInformationFromTodaysTable(_$) {
    // First, select all the table rows
    const rows = _$('.tide-header-today.tide-header__card table.tide-day-tides tbody tr');
    // Create an array to store your tide data
    const tideDataArr = [];

    // Loop through each row, starting from index 1 to skip the header row
    rows.each((index, element) => {
      // Skip the first row (the header with "Tide", "Time", "Height")
      if (index === 0) 
        return;
  
      // Now we're working with each data row
      // Use $tide(element) to convert the element into a Cheerio object we can query
      const row = $tide(element);
      // Extract the tide type from the first <td>
      const tideType = row.find('td').eq(0).text().trim();
      // Extract the time from the <b> tag in the second <td>
      const time = row.find('td').eq(1).find('b').text().trim();
      // Extract the date from the <span> tag in the second <td>
      const date = row.find('td').eq(1).find('span').text().trim();
      // Extract the height in meters from the <b> tag in the third <td>
      const heightMeters = row.find('td').eq(2).find('b').text().trim();
      // Extract the height in feet from the <span> tag in the third <td>
      const heightFeet = row.find('td').eq(2).find('span').text().trim();
      
      const dateObj = f_parseStrToDateObject(date, time);

      // Store this tide information in an object
      tideDataArr.push({
        type: tideType,
        time: dateObj,
        heightMeters: heightMeters,
        heightFeet: heightFeet
      });
    });
    return tideDataArr
  }

  // Fetch the tide forecast webpage
  const tideResponse = await axios.get('https://www.tide-forecast.com/locations/Husavik-Iceland/tides/latest', {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
  });

  // Load tide HTML into cheerio
  const $tide = cheerio.load(tideResponse.data);

  const dataArr = f_extractInformationFromTodaysTable($tide);
  console.log({dataArr});

  const tideHeaderToday = $tide('.tide-header-today.tide-header__card').html();
  return tideHeaderToday;
}


function f_convertTo24Hour(_timeStr) {
  function f_reformat(_str) {
    if( ! _str)
      return;
    const [time, modifier] = _str.trim().split(' ');
    //console.log(time, modifier);
    if( ! time || ! modifier)
      return;
    let [hours, minutes] = time.split(':');
    //console.log(hours, minutes);
    if( ! hours || ! minutes)
      return;
    if( hours === '12' )
      hours = '00';
    if( modifier === 'PM' )
      hours = parseInt(hours, 10) + 12;
    hours = hours.toString()
    return `${hours.padStart(2, '0')}:${minutes}`;
  }
  
  // Replace all 12-hour times with 24-hour format
  return _timeStr.replace(/(\d{1,2}:\d{2})\s?(AM|PM)/gi, (match) => {
    return f_reformat(match);
  });
}



// Sea to scrape tide data and sea conditions
app.get('/tides', async (req, res) => {
  try {
    /*
    // Fetch the tide forecast webpage
    const tideResponse = await axios.get('https://www.tide-forecast.com/locations/Husavik-Iceland/tides/latest', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    */
    /*
    // Load tide HTML into cheerio
    const $tide = cheerio.load(tideResponse.data);
    const tideHeaderToday = f_convertTo24Hour( $tide('.tide-header-today.tide-header__card').html() );
    //console.log(tideHeaderToday, '\n');
    */
    const tideHeaderToday = await f_fetchTideForecastFromWebpage();


    
    // Fetch the sea conditions webpage
    const seaResponse = await axios.get('https://www.vegagerdin.is/vs/Today.aspx', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    // Load sea conditions HTML into cheerio
    const $sea = cheerio.load(seaResponse.data);
    const seaImg = $sea('#ctl00_ContentPlaceHolder1_imgToday');
    const seaImgSrc = seaImg.attr('src');
    
    // Construct full image URL (relative to base URL)
    const seaImageUrl = seaImgSrc ? `https://www.vegagerdin.is/vs/${seaImgSrc}` : '';
    
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
            .tide-data .has-text-centered,
            .tide-header-today__tide-times,
            .tide-header-today__table-container img,
            .tide-day-tides tbody tr:first-child,
            .tide-day-tides span[class="tide-day-tides__secondary"] {
              display: none;
            }

            .tide-data {
              flex: 1;
            }

            .tide-data table,
            .tide-data tbody {
              width: 100%;
            }

            .tide-data tr {
              width: 100%;
              display: flex;
              flex-wrap: nowrap;
              justify-content: space-between;
            }

            .tide-data tr > td {
              font-size: 2em;
              min-width: 31%;
            }
            
            /* sea Conditions Image */
            .sea-image {
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
                ${seaImageUrl ? `<img src="${seaImageUrl}" alt="Iceland Sea Conditions" class="sea-image">` : '<div class="placeholder">Sea conditions image not available</div>'}
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
