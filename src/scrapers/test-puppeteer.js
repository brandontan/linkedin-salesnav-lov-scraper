const puppeteer = require('puppeteer');

async function testPuppeteer() {
  console.log('Starting Puppeteer test...');
  
  const browser = await puppeteer.launch({
    headless: false, // Set to false to see the browser
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--disable-gpu',
      '--window-size=1920x1080'
    ],
    slowMo: 50 // Slow down operations by 50ms
  });

  try {
    console.log('Browser launched successfully');
    
    const page = await browser.newPage();
    console.log('New page created');
    
    // Set viewport
    await page.setViewport({ width: 1920, height: 1080 });
    console.log('Viewport set');
    
    // Set user agent
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');
    console.log('User agent set');
    
    // Navigate to a test page
    console.log('Navigating to test page...');
    await page.goto('https://www.linkedin.com/jobs/search/?keywords=full%20stack%20developer&location=United%20States', {
      waitUntil: 'networkidle0',
      timeout: 30000
    });
    console.log('Page loaded successfully');
    
    // Take a screenshot
    await page.screenshot({ path: 'test-screenshot.png' });
    console.log('Screenshot taken');
    
    // Get page title
    const title = await page.title();
    console.log('Page title:', title);
    
  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    await browser.close();
    console.log('Browser closed');
  }
}

// Run the test
testPuppeteer().catch(console.error); 