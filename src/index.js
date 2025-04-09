const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const dotenv = require('dotenv');
const puppeteer = require('puppeteer-core');

// Load environment variables
dotenv.config();

// Config
const config = {
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  tcvsUrl: process.env.TCVS_URL || 'https://tcvs.fiscal.treasury.gov/',
  browserlessApiKey: process.env.BROWSERLESS_API_KEY
};

// TCVS Service class
class TCVSService {
  /**
   * Submits the TCVS form with provided data
   * @param formData - The data to submit in the form
   * @returns Promise with the result of the submission
   */
  async submitForm(formData) {
    let browser = null;
    let page = null;

    try {
      console.log('Connecting to Browserless...');
      const browserWSEndpoint = `wss://chrome.browserless.io?token=${config.browserlessApiKey}`;
      
      browser = await puppeteer.connect({
        browserWSEndpoint,
        defaultViewport: { width: 1280, height: 800 }
      });
      
      console.log('Creating new page...');
      page = await browser.newPage();
      
      // Set a realistic user agent
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');

      // Log console messages from the page
      page.on('console', msg => console.log('Page console:', msg.text()));
      
      console.log('Navigating to TCVS website...');
      await page.goto(config.tcvsUrl, { 
        waitUntil: 'networkidle2',
        timeout: 60000
      });

      console.log('Page loaded, waiting for content...');
      
      // Wait for the form to be available
      await page.waitForSelector('form', { timeout: 20000 });
      
      console.log('Form found, filling fields...');
      
      // Use the correct selectors based on our analysis
      await page.type('#issue_date', formData.issueDate);
      await page.type('#symbol_number', formData.symbol);
      await page.type('#serial_number', formData.serial);
      await page.type('#amount', formData.checkAmount);
      await page.type('#bank_rtn', formData.rtn);
      
      console.log('Form filled, submitting...');
      
      // Find and click the submit button
      const submitButton = await page.$('button[type="submit"]');
      if (!submitButton) {
        throw new Error('Could not find submit button');
      }
      
      await submitButton.click();
      
      // Wait for response
      await page.waitForTimeout(5000);
      
      console.log('Form submitted, capturing result...');
      
      // Take screenshot for debugging
      try {
        await page.screenshot({ path: '/tmp/result-screenshot.png' });
      } catch (e) {
        console.log('Could not take screenshot:', e.message);
      }
      
      // Extract result text
      const resultText = await page.evaluate(() => {
        return document.body.textContent;
      });
      
      return {
        success: true,
        message: 'Form submitted successfully',
        data: {
          result: resultText || 'No specific result text found'
        }
      };
    } catch (error) {
      console.error('Error in form submission:', error);
      
      // Additional error info
      let errorInfo = {
        message: error.message,
        stack: error.stack
      };
      
      // If page exists, try to get current URL and content
      if (page) {
        try {
          errorInfo.currentUrl = await page.url();
        } catch (e) {
          console.error('Error getting URL:', e);
        }
      }
      
      return {
        success: false,
        message: 'Failed to submit form',
        error: error.message,
        details: errorInfo
      };
    } finally {
      if (page) {
        await page.close();
      }
      if (browser) {
        await browser.close();
      }
    }
  }
}

// TCVS Controller class
class TCVSController {
  constructor() {
    this.tcvsService = new TCVSService();
  }

  /**
   * Handle form submission requests
   */
  async submitForm(req, res) {
    try {
      console.log('Received form submission request:', req.body);
      
      const formData = {
        issueDate: req.body.issueDate,
        symbol: req.body.symbol,
        serial: req.body.serial,
        checkAmount: req.body.checkAmount,
        rtn: req.body.rtn
      };

      // Validate required fields
      const requiredFields = ['issueDate', 'symbol', 'serial', 'checkAmount', 'rtn'];
      const missingFields = requiredFields.filter(field => !req.body[field]);

      if (missingFields.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields',
          error: `Missing fields: ${missingFields.join(', ')}`
        });
      }

      // Submit the form using the service
      console.log('Starting form submission...');
      const result = await this.tcvsService.submitForm(formData);
      
      console.log('Form submission result:', result);
      
      if (result.success) {
        return res.status(200).json(result);
      } else {
        return res.status(500).json(result);
      }
    } catch (error) {
      console.error('Unexpected error in controller:', error);
      return res.status(500).json({
        success: false,
        message: 'An unexpected error occurred',
        error: error.message,
        stack: error.stack
      });
    }
  }
}

// Create Express app
const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(morgan(config.nodeEnv === 'development' ? 'dev' : 'combined'));

// Request logging
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

// Initialize controller
const tcvsController = new TCVSController();

// API routes
const router = express.Router();

// Health check endpoint
router.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'healthy',
    environment: config.nodeEnv,
    targetUrl: config.tcvsUrl 
  });
});

// TCVS form submission endpoint
router.post('/submit', (req, res) => tcvsController.submitForm(req, res));

// Debug endpoint to check site structure
router.get('/debug', async (req, res) => {
  try {
    const tcvsService = new TCVSService();
    const browser = await puppeteer.connect({
      browserWSEndpoint: `wss://chrome.browserless.io?token=${config.browserlessApiKey}`,
    });
    
    const page = await browser.newPage();
    await page.goto(config.tcvsUrl, { waitUntil: 'networkidle2' });
    
    const formElements = await page.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll('input'));
      const buttons = Array.from(document.querySelectorAll('button, input[type="submit"]'));
      
      return {
        inputs: inputs.map(i => ({ id: i.id, name: i.name, type: i.type })),
        buttons: buttons.map(b => ({ id: b.id, type: b.type, text: b.innerText || b.value }))
      };
    });
    
    await browser.close();
    
    res.status(200).json({
      success: true,
      data: formElements
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Debug failed',
      error: error.message
    });
  }
});

app.use('/api', router);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: config.nodeEnv === 'development' ? err.message : 'Something went wrong',
    stack: config.nodeEnv === 'development' ? err.stack : undefined
  });
});

// Start server
app.listen(config.port, () => {
  console.log(`Server running on port ${config.port} in ${config.nodeEnv} mode`);
}); 