# TCVS Form Automation API

A headless API that automates form submissions on the [Treasury Check Verification System (TCVS)](https://tcvs.fiscal.treasury.gov/) website using Puppeteer.

## Prerequisites

- Node.js (v14 or higher)
- npm

## Installation

1. Clone this repository
2. Install dependencies:
   ```
   npm install
   ```
3. Configure environment variables in `.env` file:
   ```
   PORT=3000
   NODE_ENV=development
   TCVS_URL=https://tcvs.fiscal.treasury.gov/
   ```

## Usage

### Starting the API

```
npm start
```

The API will run on http://localhost:3000 (or the port specified in your .env file).

### API Endpoints

#### Health Check
```
GET /api/health
```

#### Submit TCVS Form
```
POST /api/submit
```

Request body:
```json
{
  "issueDate": "12/06/24",
  "symbol": "4045",
  "serial": "57285965",
  "checkAmount": "10.00",
  "rtn": "000000518"
}
```

Response:
```json
{
  "success": true,
  "message": "Form submitted successfully",
  "data": {
    "result": "..." // Result from the TCVS form submission
  }
}
```

## .NET Integration

A sample C# client is provided in the `DotNetClientExample` directory.

Example usage:

```csharp
var client = new TcvsApiClient();
            
var result = await client.SubmitTcvsFormAsync(
    issueDate: "12/06/24",
    symbol: "4045",
    serial: "57285965",
    checkAmount: "10.00",
    rtn: "000000518"
);

if (result.Success)
{
    Console.WriteLine($"Form submission successful: {result.Message}");
    Console.WriteLine($"Result: {result.Data}");
}
else
{
    Console.WriteLine($"Form submission failed: {result.Error}");
}
```

## Important Notes

- **reCAPTCHA Notice**: This code attempts to automate reCAPTCHA which is against Google's Terms of Service. This is provided for educational purposes only.
- **Production Considerations**: In a production environment, consider:
  - 2Captcha or similar services (check legal implications)
  - Human-in-the-loop solutions for CAPTCHA solving
  - Server-side validation and rate limiting
- **Puppeteer Configuration**: Adjust browser launch options in `src/index.js` as needed for your environment. 