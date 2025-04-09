const puppeteer = require('puppeteer-core');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Initialize config
const config = {
  tcvsUrl: process.env.TCVS_URL || 'https://tcvs.fiscal.treasury.gov/',
  browserlessApiKey: process.env.BROWSERLESS_API_KEY
};

async function checkSiteStructure() {
  let browser = null;
  
  try {
    console.log('Connecting to Browserless.io...');
    const browserWSEndpoint = `wss://chrome.browserless.io?token=${config.browserlessApiKey}`;
    
    browser = await puppeteer.connect({
      browserWSEndpoint,
      defaultViewport: { width: 1280, height: 800 }
    });
    
    const page = await browser.newPage();
    
    // Set a realistic user agent
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');
    
    console.log(`Navigating to ${config.tcvsUrl}...`);
    await page.goto(config.tcvsUrl, { waitUntil: 'networkidle2', timeout: 60000 });
    
    console.log('Page loaded, checking structure...');
    
    // Check for form elements
    const formInfo = await page.evaluate(() => {
      // Get all forms
      const forms = Array.from(document.querySelectorAll('form'));
      
      // Get all input elements
      const inputs = Array.from(document.querySelectorAll('input'));
      
      // Get all buttons
      const buttons = Array.from(document.querySelectorAll('button, input[type="submit"]'));
      
      return {
        formsCount: forms.length,
        forms: forms.map(form => ({
          id: form.id,
          method: form.method,
          action: form.action,
          className: form.className
        })),
        inputs: inputs.map(input => ({
          id: input.id,
          name: input.name,
          type: input.type,
          className: input.className,
          placeholder: input.placeholder
        })),
        buttons: buttons.map(button => ({
          id: button.id,
          type: button.type,
          text: button.innerText || button.value,
          className: button.className
        }))
      };
    });
    
    console.log('Site structure information:');
    console.log(JSON.stringify(formInfo, null, 2));
    
    // Take a screenshot for visual verification
    await page.screenshot({ path: 'site-screenshot.png' });
    console.log('Screenshot saved as site-screenshot.png');
    
    return formInfo;
  } catch (error) {
    console.error('Error:', error);
    throw error;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// Run the function
checkSiteStructure()
  .then(() => console.log('Site check completed'))
  .catch(err => console.error('Site check failed:', err)); 