const puppeteer = require('puppeteer-core');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

// Load environment variables
dotenv.config();

// Initialize config
const config = {
  tcvsUrl: process.env.TCVS_URL || 'https://tcvs.fiscal.treasury.gov/',
  browserlessApiKey: process.env.BROWSERLESS_API_KEY
};

// Helper functions
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

// Test data for form submission
const testData = {
  issueDate: "12/06/24",
  symbol: "4045",
  serial: "57285965",
  checkAmount: "10.00",
  rtn: "000000518"
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
    
    // Enable console logging from the page
    page.on('console', msg => console.log('Page console:', msg.text()));
    
    console.log(`Navigating to ${config.tcvsUrl}...`);
    await page.goto(config.tcvsUrl, { waitUntil: 'networkidle2', timeout: 60000 });
    
    console.log('Page loaded, checking form structure...');
    
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
    
    console.log('Form structure information:');
    console.log(JSON.stringify(formInfo, null, 2));
    
    // Take a screenshot of the form
    await page.screenshot({ path: 'form-screenshot.png' });
    console.log('Form screenshot saved as form-screenshot.png');
    
    // Now submit the form to check verification result structure
    console.log('\nFilling form with test data...');
    await page.type('#issue_date', testData.issueDate);
    await delay(300);
    
    await page.type('#symbol_number', testData.symbol);
    await delay(300);
    
    await page.type('#serial_number', testData.serial);
    await delay(300);
    
    await page.type('#amount', testData.checkAmount);
    await delay(300);
    
    await page.type('#bank_rtn', testData.rtn);
    await delay(500);
    
    console.log('Form filled, submitting...');
    
    // Find and click submit button
    const submitButton = await page.$('button[type="submit"]');
    if (!submitButton) {
      throw new Error('Could not find submit button');
    }
    
    // Click the button and wait for navigation
    await Promise.all([
      page.waitForNavigation({ timeout: 30000 }).catch(e => console.log('Navigation timeout, continuing...')),
      submitButton.click()
    ]);
    
    // Wait a moment for any AJAX or dynamic content
    await delay(5000);
    
    console.log('\nForm submitted, checking verification result structure...');
    
    // Take a screenshot of the result page
    await page.screenshot({ path: 'result-screenshot.png' });
    console.log('Result screenshot saved as result-screenshot.png');
    
    // Analyze the DOM structure of the result page
    const resultStructure = await page.evaluate(() => {
      // Get all relevant elements that might contain verification results
      const resultInfo = {
        url: window.location.href,
        title: document.title,
        headings: Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6')).map(h => ({
          tag: h.tagName,
          text: h.textContent.trim(),
          className: h.className
        })),
        paragraphs: Array.from(document.querySelectorAll('p')).map(p => ({
          text: p.textContent.trim(),
          className: p.className
        })),
        divs: Array.from(document.querySelectorAll('div[class*="result"], div[class*="status"], div[class*="message"], div[class*="alert"]')).map(div => ({
          text: div.textContent.trim(),
          className: div.className,
          id: div.id
        })),
        tables: Array.from(document.querySelectorAll('table')).map(table => ({
          className: table.className,
          id: table.id,
          rows: Array.from(table.querySelectorAll('tr')).map(tr => 
            Array.from(tr.querySelectorAll('td, th')).map(cell => cell.textContent.trim())
          )
        })),
        forms: Array.from(document.querySelectorAll('form')).length,
        inputs: Array.from(document.querySelectorAll('input')).length,
        buttons: Array.from(document.querySelectorAll('button')).length
      };
      
      // Get the full HTML for thorough analysis
      resultInfo.bodyHtml = document.body.innerHTML;
      
      return resultInfo;
    });
    
    console.log('\nVerification result page structure:');
    
    // Log just the important parts for the console
    const simplifiedStructure = { 
      url: resultStructure.url,
      title: resultStructure.title,
      headings: resultStructure.headings,
      paragraphs: resultStructure.paragraphs.slice(0, 5), // Show just the first few
      divs: resultStructure.divs,
      tables: resultStructure.tables.map(table => ({
        className: table.className,
        id: table.id,
        rowCount: table.rows.length,
        firstRow: table.rows[0]
      })),
      formCount: resultStructure.forms,
      inputCount: resultStructure.inputs,
      buttonCount: resultStructure.buttons
    };
    
    console.log(JSON.stringify(simplifiedStructure, null, 2));
    
    // Save the full structure to a file for detailed analysis
    fs.writeFileSync(
      path.join(__dirname, 'verification-result-structure.json'), 
      JSON.stringify(resultStructure, null, 2)
    );
    console.log('\nFull result structure saved to verification-result-structure.json');
    
    // Try our extraction logic to see if it works
    const extractedResult = await page.evaluate(() => {
      // First, check for the specific Angular-based verification result format
      const validationDivs = document.querySelectorAll('div.col');
      for (const div of validationDivs) {
        // Check if this div has the "Validation Results" heading
        const heading = div.querySelector('h3');
        if (heading && heading.textContent.trim() === 'Validation Results') {
          // Found the validation results container
          
          // Check for alert divs that contain the actual result
          const alertDiv = div.querySelector('div.alert');
          if (alertDiv) {
            // Get the result heading (e.g., "Check Verified" or "No Match")
            const resultHeading = alertDiv.querySelector('h3');
            const status = resultHeading ? resultHeading.textContent.trim() : '';
            
            // Get the status text that follows (e.g., "Status: Paid" or "Check information does not match our records")
            // We need to get the text content excluding the h3 content
            const details = alertDiv.textContent.replace(resultHeading ? resultHeading.textContent : '', '').trim();
            
            // Determine if this is a successful verification
            const isSuccessful = status === 'Check Verified';
            
            // Determine the alert type (alert-danger, alert-success, etc.)
            const alertClass = alertDiv.className;
            
            console.log('\nFound specific Angular-based verification result:');
            console.log(`- Status: ${status}`);
            console.log(`- Details: ${details}`);
            console.log(`- Success: ${isSuccessful}`);
            console.log(`- Alert Class: ${alertClass}`);
            
            return {
              format: 'angular',
              status,
              details,
              isSuccessful,
              alertClass,
              fullText: alertDiv.textContent.trim()
            };
          }
        }
      }
      
      // If we didn't find the Angular format, try generic extraction
      console.log('\nFalling back to generic extraction...');
      
      // Extracting verification status
      let verificationStatus = '';
      const statusElements = document.querySelectorAll('.status-message, .verification-status, .alert, .result-message');
      for (const element of statusElements) {
        if (element.textContent.trim()) {
          verificationStatus = element.textContent.trim();
          break;
        }
      }
      
      // Look for check details in the result
      const checkDetails = {};
      
      // Try to extract details from result table or formatted result
      const detailsTable = document.querySelector('table.results, table.check-details');
      if (detailsTable) {
        const rows = detailsTable.querySelectorAll('tr');
        for (const row of rows) {
          const cells = row.querySelectorAll('td, th');
          if (cells.length >= 2) {
            const key = cells[0].textContent.trim().replace(/:$/, '');
            const value = cells[1].textContent.trim();
            if (key && value) {
              checkDetails[key] = value;
            }
          }
        }
      }
      
      // Look for result text blocks
      let resultText = '';
      const resultBlocks = document.querySelectorAll('.result-block, .verification-result, .message-block');
      for (const block of resultBlocks) {
        if (block.textContent.trim()) {
          resultText = block.textContent.trim();
          break;
        }
      }
      
      // If we didn't find specific elements, try to find text containing verification keywords
      if (!verificationStatus && !resultText) {
        const allParagraphs = document.querySelectorAll('p, div, span');
        for (const p of allParagraphs) {
          const text = p.textContent.trim();
          if (text.includes('verify') || text.includes('check') || text.includes('status') || 
              text.includes('result') || text.includes('valid') || text.includes('invalid')) {
            resultText = text;
            break;
          }
        }
      }
      
      // If still no results, get the main content
      if (!verificationStatus && !resultText && Object.keys(checkDetails).length === 0) {
        resultText = document.body.textContent.substring(0, 1000);
      }
      
      return {
        format: 'generic',
        status: verificationStatus,
        details: checkDetails,
        resultText: resultText
      };
    });
    
    console.log('\nExtracted verification result:');
    console.log(JSON.stringify(extractedResult, null, 2));
    
    // Create test verification results (both formats) to validate extraction logic
    console.log('\nTesting extraction on both verification result formats...');
    
    // First format: Check Verified
    const testVerifiedContent = `
      <div _ngcontent-ng-c2147397721="" class="col">
        <h3 _ngcontent-ng-c2147397721="">Validation Results</h3>
        <div _ngcontent-ng-c2147397721="" class="alert alert-danger">
          <h3 _ngcontent-ng-c2147397721="">Check Verified</h3> Status: Paid 
        </div>
      </div>
    `;
    
    // Second format: No Match
    const testNoMatchContent = `
      <div _ngcontent-ng-c2147397721="" class="col">
        <h3 _ngcontent-ng-c2147397721="">Validation Results</h3>
        <div _ngcontent-ng-c2147397721="" class="alert alert-danger">
          <h3 _ngcontent-ng-c2147397721="">No Match</h3> Check information does not match our records 
        </div>
      </div>
    `;
    
    // Add test HTML to body temporarily
    await page.evaluate((verifiedHTML, noMatchHTML) => {
      const testDiv = document.createElement('div');
      testDiv.id = 'test-results';
      testDiv.innerHTML = `
        <h2>Test Verification Results</h2>
        <div id="verified-test">${verifiedHTML}</div>
        <div id="no-match-test">${noMatchHTML}</div>
      `;
      document.body.appendChild(testDiv);
    }, testVerifiedContent, testNoMatchContent);
    
    // Take screenshot with test results
    await page.screenshot({ path: 'test-formats-screenshot.png' });
    console.log('Test formats screenshot saved as test-formats-screenshot.png');
    
    // Test extraction on both formats
    const extractionTests = await page.evaluate(() => {
      const results = {};
      
      // Helper function to extract from a specific container
      const extractFromContainer = (containerId) => {
        const container = document.querySelector(`#${containerId}`);
        if (!container) return null;
        
        const validationDiv = container.querySelector('div.col');
        if (!validationDiv) return null;
        
        const heading = validationDiv.querySelector('h3');
        if (!heading || heading.textContent.trim() !== 'Validation Results') return null;
        
        const alertDiv = validationDiv.querySelector('div.alert');
        if (!alertDiv) return null;
        
        const resultHeading = alertDiv.querySelector('h3');
        const status = resultHeading ? resultHeading.textContent.trim() : '';
        const details = alertDiv.textContent.replace(resultHeading ? resultHeading.textContent : '', '').trim();
        const isSuccessful = status === 'Check Verified';
        const alertClass = alertDiv.className;
        
        return {
          status,
          details,
          isSuccessful,
          alertClass,
          fullText: alertDiv.textContent.trim()
        };
      };
      
      // Test both formats
      results.verified = extractFromContainer('verified-test');
      results.noMatch = extractFromContainer('no-match-test');
      
      return results;
    });
    
    console.log('\nExtraction test results:');
    console.log('Verified format extraction:');
    console.log(JSON.stringify(extractionTests.verified, null, 2));
    console.log('\nNo Match format extraction:');
    console.log(JSON.stringify(extractionTests.noMatch, null, 2));
    
    // Clean up test elements
    await page.evaluate(() => {
      const testDiv = document.getElementById('test-results');
      if (testDiv) testDiv.remove();
    });
    
    return {
      formInfo,
      resultStructure: simplifiedStructure,
      extractedResult,
      extractionTests
    };
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
  .then(() => console.log('\nSite check completed successfully'))
  .catch(err => console.error('Site check failed:', err)); 