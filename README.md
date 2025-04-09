# TCVS Form Automation API

This API automates the submission of forms to the Treasury Check Verification System (TCVS) at the U.S. Department of the Treasury. It uses Puppeteer and Browserless.io to programmatically fill and submit the verification form.

## Features

- Automated form submission to TCVS
- RESTful API endpoints
- Browser automation with Puppeteer
- Cloud-based browser execution via Browserless.io
- Error handling and logging
- Deployed on Vercel
- .NET client library for easy integration

## API Endpoints

### Health Check
```
GET /api/health
```
Returns the service status and configuration information.

### Form Submission
```
POST /api/submit
```
Submits the TCVS form with the provided data.

Request Body:
```json
{
  "issueDate": "MM/DD/YYYY",
  "symbol": "1234",
  "serial": "12345678",
  "checkAmount": "123.45",
  "rtn": "123456789"
}
```

| Field | Description | Format |
|-------|-------------|--------|
| issueDate | The issue date of the check | MM/DD/YYYY |
| symbol | The check symbol number | 4 digits |
| serial | The check serial number | 8 digits |
| checkAmount | The amount of the check | Decimal number |
| rtn | Bank routing transit number | 9 digits |

Response:
```json
{
  "success": true,
  "message": "Form submitted successfully",
  "data": {
    "currentUrl": "https://tcvs.fiscal.treasury.gov/result",
    "result": "The verification result text from the page"
  }
}
```

### Debug Endpoint
```
GET /api/debug
```
Returns information about the form elements on the TCVS website. Useful for troubleshooting.

## Deployment

This API is deployed on Vercel at:
```
https://automate-form-submission.vercel.app/
```

### Environment Variables

The following environment variables need to be set in your Vercel deployment:

- `PORT`: Server port (default: 3000)
- `NODE_ENV`: Environment (development or production)
- `TCVS_URL`: URL of the TCVS website
- `BROWSERLESS_API_KEY`: Your Browserless.io API key

## Development

### Prerequisites

- Node.js 22.x
- Browserless.io account and API key

### Installation

1. Clone the repository
```bash
git clone https://github.com/yourusername/automate-form-submission.git
cd automate-form-submission
```

2. Install dependencies
```bash
npm install
```

3. Create a `.env` file in the root directory with the following content:
```
PORT=3000
NODE_ENV=development
TCVS_URL=https://tcvs.fiscal.treasury.gov/
BROWSERLESS_API_KEY=your_browserless_api_key
```

4. Start the server
```bash
npm start
```

### Testing with Postman

1. Import the provided Postman collection (if available)
2. Or create a new request:
   - Method: POST
   - URL: `http://localhost:3000/api/submit` (local) or `https://automate-form-submission.vercel.app/api/submit` (production)
   - Headers: `Content-Type: application/json`
   - Body (raw JSON):
```json
{
  "issueDate": "04/10/2024",
  "symbol": "1234",
  "serial": "12345678",
  "checkAmount": "123.45",
  "rtn": "123456789"
}
```

## Limitations

- The service is subject to Vercel's serverless function timeout limits (10 seconds on the free plan)
- Browser automation may be detected and blocked by anti-bot measures on some websites
- reCAPTCHA automation is not fully implemented as it's against Google's Terms of Service

## Troubleshooting

- If you encounter the error `Waiting for selector failed`, check if the website structure has changed
- For timeout errors, consider upgrading to Vercel Pro or using a different hosting provider
- Verify your Browserless.io API key is correct and has sufficient credits

## License

ISC

## .NET Integration

A .NET client library is included in the `DotNetClientExample` directory for easy integration with C# applications. The client includes a verification step to allow users to confirm the check information before submission.

### Features

- Easy API integration with .NET applications
- Built-in verification step for user confirmation
- Support for card reader integration
- Windows Forms UI for interactive verification
- Error handling and logging

### Console Application Usage

```csharp
// Create client with default URL (Vercel deployment)
var client = new TcvsApiClient();

// Check API health
var healthCheck = await client.CheckHealthAsync();
if (healthCheck.Success)
{
    Console.WriteLine($"API Health Check: {healthCheck.Message}");
}

// Submit form to TCVS with verification
var result = await client.SubmitTcvsFormAsync(
    issueDate: "04/10/2024",
    symbol: "1234",
    serial: "12345678",
    checkAmount: "123.45",
    rtn: "123456789"
);

if (result.Success)
{
    Console.WriteLine($"Form submission successful: {result.Message}");
    Console.WriteLine($"Result URL: {result.Data?.CurrentUrl}");
    Console.WriteLine($"Result content: {result.Data?.Result}");
}
else
{
    Console.WriteLine($"Form submission failed: {result.Error}");
}
```

### Windows Forms Application

A fully functional Windows Forms application is included to demonstrate how to integrate with a card reader and provide a user-friendly verification interface.

#### Features:
- User interface for check verification
- Card reader simulation (can be replaced with actual card reader integration)
- Verification step before submission to TCVS
- Detailed result display
- Error handling and user feedback

To run the Windows Forms application:
```
cd DotNetClientExample
dotnet build
dotnet run
```

### TcvsApiClient Methods

| Method | Description |
|--------|-------------|
| `SubmitTcvsFormAsync` | Submits a form to the TCVS system with optional verification |
| `CheckHealthAsync` | Checks the health status of the API | 