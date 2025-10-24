// First install dependencies: npm install express axios cheerio

const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');

const app = express();
const PORT = 3000;



async function f_fetchTideForecastFromWebpage() {

  function f_parseStrToDateObject(_dateStr, _timeStr) {
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    const dateMatch = _dateStr.match(/\d+\s+\w+/);
    const [day, month] = dateMatch[0].split(' ');
    const monthIndex = monthNames.findIndex(m => m.startsWith(month));

    const [timeStr, period] = _timeStr.split(' ');
    let [hours, minutes] = timeStr.split(':').map(Number);

    if (period === 'PM' && hours !== 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;

    const year = new Date().getFullYear();
    const randomSeconds = Math.floor(Math.random() * 59) + 1; // 1 to 59
    const dateObj = new Date(year, monthIndex, parseInt(day), hours, minutes, randomSeconds);
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

  //-- START HERE -- f_fetchTideForecastFromWebpage()
  // Fetch the tide forecast webpage
  const tideResponse = await axios.get('https://www.tide-forecast.com/locations/Husavik-Iceland/tides/latest', {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
  });
  // Load tide HTML into cheerio
  const $tide = cheerio.load(tideResponse.data);
  const dataArr = f_extractInformationFromTodaysTable($tide);
  //const tideHeaderToday = $tide('.tide-header-today.tide-header__card').html();
  //console.log({dataArr});
  return dataArr;
}

function f_generateHtmlForTideHeader(_tideDataArr) {
  const $ = cheerio.load('<table><tbody></tbody></table>');
  const tbody = $('tbody');
  tbody.empty();
  
  const now = new Date();
  let upcomingIndex = -1;
  let minDiff = Infinity;
  
  // Find the upcoming tide (closest future time)
  _tideDataArr.forEach((tide, index) => {
    const target = new Date(tide.time);
    const diff = target - now;
    if (diff > 0 && diff < minDiff) {
      minDiff = diff;
      upcomingIndex = index;
    }
  });
  
  _tideDataArr.forEach((tide, index) => {
    const date = tide.time;
    const timeStr = date.toISOString()
    const formattedTimeStr = date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: 'UTC'
    });
    
    const typeClass = tide.type === 'Low Tide' ? 'low-tide' : 'high-tide';
    const flipClass = tide.type === 'Low Tide' ? 'flip' : '';
    const upcomingClass = index === upcomingIndex ? ' class="upcoming"' : '';
    
    const svgIcon = `<svg class="tide-icon ${flipClass}" viewBox="0 0 1655 1400" xmlns="http://www.w3.org/2000/svg">
      <path fill="none" stroke="currentColor" paint-order="fill stroke markers"
        d="m 116,579.59554 c 38.13302,47.90001 82.94363,101.5178 147,111.55678 60.00231,7.26867 110.08855,-36.87914 147,-78.70027 112.23365,-131.50886 177.17119,-296.36523 291,-426.66211 36.8065,-40.85344 88.19512,-82.56078 147,-72.16872 64.42337,13.37411 108.56897,68.36823 147,117.57911 93.5,124.77079 156.8784,270.42566 260,388.19102 36.793,40.66019 88.4615,81.82413 147,70.79434 58.8337,-12.21781 101.0236,-61.18811 137,-105.73173"
        stroke-linecap="round" stroke-linejoin="round" stroke-miterlimit="10" stroke-width="150"/>
    </svg>`;
    
    const rowHtml = `
      <tr${upcomingClass} data-index="${index}">
        <td class="spacer"></td>
        <td class="${typeClass}">${svgIcon}<strong>${tide.type}</strong></td>
        <td>${formattedTimeStr}<span class="countdown" data-countdown="${timeStr}">-00h 00m 00s</span></td>
        <td>${tide.heightMeters}<span class="height-feet">${tide.heightFeet}</span></td>
      </tr>`;
    
    tbody.append(rowHtml);
  });
  
  return $('table').html(); // Returns the innerHTML of the table
}



// Sea to scrape tide data and sea conditions
app.get('/tides', async (req, res) => {

  let tideHeaderToday;
  try {
    const tideDataToday = await f_fetchTideForecastFromWebpage();
    tideHeaderToday = f_generateHtmlForTideHeader(tideDataToday);
    //console.log("tideDataToday: ", tideDataToday);
  } catch (error) {
    console.error({error});
    tideHeaderToday = `
      <div class="error-container">
        <h1>⚠️ Error Loading Dashboard</h1>
        <p>${error.message}</p>
        <a href="/tides">Retry</a>
      </div>`;
  }

  let seaImageUrl;
  try {
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
    seaImageUrl = seaImgSrc ? `https://www.vegagerdin.is/vs/${seaImgSrc}` : '';
  } catch (error) {
    console.error({error});
    seaImageUrl = null;
  }

  try {
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
            .text {
              margin-left: 33%;
              color: #202020ff;
              font-size: 1em;
              padding-bottom: 10px;
              flex-shrink: 0;
            }

            table {
                width: 100%;
                height: auto;
                font-size: 1.2em;
                border-collapse: collapse;
                background-color: white;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }

            td {
                padding: 12px;
                border-top: 1px solid #ddd;
                /*text-align: center;*/
                /*width: 33.33%;*/
            }

            .tide-icon {
                width: 30px;
                height: 25px;
                display: inline-block;
                vertical-align: middle;
                margin-right: 8px;
            }

            .tide-icon.flip {
                transform: scaleY(-1);
            }

            tr.upcoming {
                background-color: #ffffcc;
                font-weight: bold;
            }

           .low-tide,
           .high-tide {
                color: #1e3c72;
            }

            .height-feet,
            .countdown {
                font-style: italic;
                color: #999;
                margin-left: 5px;
                font-size: 0.9em;
            }

            /* Tide Data Styling - ERROR */
            .error-container {
              font-family: Arial, sans-serif;
              background: white;
              padding: 40px;
              text-align: center;
            }

            .error-container h1 { 
              color: #e74c3c;
            }

            .error-container a {
              display: inline-block;
              margin-top: 20px;
              padding: 10px 20px;
              background: #3498db;
              color: white;
              text-decoration: none;
              border-radius: 5px;
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
            let seconds = 630;
            function updateCountdown() {
              seconds--;
              if (seconds >= 0) {
                document.getElementById('countdown').textContent = seconds;
              }
              if (seconds === 0) {
                location.reload();
              }
            }

            // Tide Forecast
            function tideCalculateTimeUntil() {
              const tags = document.querySelectorAll("table.tide-data span.countdown");
              tags.forEach((tag, index) => {
                const now = new Date();
                const target = new Date(tag.getAttribute("data-countdown"));
                const diff = target - now;
                let str;
                if (diff < 0) {
                  const absDiff = Math.abs(diff);
                  const hours = Math.floor(absDiff / (1000 * 60 * 60));
                  const minutes = Math.floor((absDiff % (1000 * 60 * 60)) / (1000 * 60));
                  const seconds = Math.floor((absDiff % (1000 * 60)) / 1000);
                  str = \`+\${hours}h \${minutes}m \${seconds}s\`;
                } else {
                  const hours = Math.floor(diff / (1000 * 60 * 60));
                  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                  const seconds = Math.floor((diff % (1000 * 60)) / 1000);
                  str = \`-\${hours}h \${minutes}m \${seconds}s\`;
                }
                tag.textContent = str;
              });
            }
            

            
            // Initialize on page load
            window.addEventListener('DOMContentLoaded', () => {
              updateClock();
              setInterval(updateClock, 1000);
              setInterval(updateCountdown, 1000);
              setInterval(tideCalculateTimeUntil, 1000)
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

                <span class="text">Today:</span>

                <table class="tide-data">
                  ${tideHeaderToday || '<div class="placeholder">No tide data available</div>'}
                </table>

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
