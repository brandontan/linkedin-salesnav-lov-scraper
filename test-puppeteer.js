import puppeteer from 'puppeteer';

(async () => {
  try {
    console.log('Starting browser...');
    const browser = await puppeteer.launch({
      headless: false,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
        '--window-size=1920x1080'
      ]
    });
    
    console.log('Opening new page...');
    const page = await browser.newPage();
    
    console.log('Going to Google...');
    await page.goto('https://www.google.com');
    
    console.log('Waiting 5 seconds...');
    await page.waitForTimeout(5000);
    
    console.log('Closing browser...');
    await browser.close();
    
    console.log('Test completed successfully!');
  } catch (error) {
    console.error('Test failed:', error);
  }
})(); 