const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const dotenv = require('dotenv');
const puppeteer = require('puppeteer');

// Load environment variables
dotenv.config();

// Config
const config = {
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  tcvsUrl: process.env.TCVS_URL || 'https://tcvs.fiscal.treasury.gov/'
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

    try {
      // Launch browser with specific options for Vercel serverless environment
      browser = await puppeteer.launch({
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--single-process',
          '--disable-gpu'
        ],
        headless: "new"
      });
      
      const page = await browser.newPage();
      
      // Navigate to the TCVS website
      await page.goto(config.tcvsUrl, { waitUntil: 'networkidle2' });
      
      // Wait for form fields to be visible
      await page.waitForSelector('#issueDateInput', { visible: true });
      
      // Fill in the form fields
      await page.type('#issueDateInput', formData.issueDate);
      await page.type('#symbolInput', formData.symbol);
      await page.type('#serialInput', formData.serial);
      await page.type('#checkAmountInput', formData.checkAmount);
      await page.type('#rtnInput', formData.rtn);
      
      // Check reCAPTCHA checkbox (this may require additional handling)
      // Note: Automating reCAPTCHA is against Google's Terms of Service
      // This is for demonstration purposes only
      const recaptchaFrame = await page.waitForSelector('.g-recaptcha iframe');
      if (recaptchaFrame) {
        const frameHandle = await recaptchaFrame.contentFrame();
        if (frameHandle) {
          await frameHandle.waitForSelector('#recaptcha-anchor', { visible: true });
          await frameHandle.click('#recaptcha-anchor');
        }
      }
      
      // Submit the form
      await Promise.all([
        page.waitForNavigation({ waitUntil: 'networkidle2' }),
        page.click('#submitButton')
      ]);
      
      // Extract results
      const resultText = await page.evaluate(() => {
        const resultElement = document.querySelector('.result-container');
        return resultElement ? resultElement.textContent : null;
      });
      
      return {
        success: true,
        message: 'Form submitted successfully',
        data: {
          result: resultText
        }
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to submit form',
        error: error.message
      };
    } finally {
      if (browser !== null) {
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
      const result = await this.tcvsService.submitForm(formData);
      
      if (result.success) {
        return res.status(200).json(result);
      } else {
        return res.status(500).json(result);
      }
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'An unexpected error occurred',
        error: error.message
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

// Initialize controller
const tcvsController = new TCVSController();

// API routes
const router = express.Router();

// Health check endpoint
router.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy' });
});

// TCVS form submission endpoint
router.post('/submit', (req, res) => tcvsController.submitForm(req, res));

app.use('/api', router);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: config.nodeEnv === 'development' ? err.message : 'Something went wrong'
  });
});

// Start server
app.listen(config.port, () => {
  console.log(`Server running on port ${config.port} in ${config.nodeEnv} mode`);
}); 