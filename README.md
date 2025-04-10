# TCVS Form Automation API

This API provides an automated interface for submitting forms to the Treasury Check Verification System (TCVS) website.

## Features

- Automated form submission to the TCVS website
- Error handling with retry mechanism
- Simulated responses for development/testing
- Support for reCAPTCHA handling

## Installation

```bash
# Install dependencies
npm install

# Create .env file (use .env.example as a template)
cp .env.example .env

# Edit .env file with your configuration
```

## Usage

```bash
# Start the server
npm start

# Development mode with nodemon
npm run dev
```

## API Endpoints

### Check Health
```
GET /api/health
```

### Submit TCVS Form
```
POST /api/submit

Body:
{
  "issueDate": "12/25/23",
  "symbol": "1234",
  "serial": "56789012",
  "checkAmount": "100.00",
  "rtn": "000000518"
}
```

## Handling Treasury Server Errors

The Treasury website sometimes returns "Server error fetching results" messages. This is a server-side issue with the Treasury's TCVS system. To handle these situations, the API includes simulation capabilities:

### Environment Variables for Error Handling

In your `.env` file, you can configure how the API responds to Treasury server errors:

```
# Automatically simulate responses when Treasury server returns errors
AUTO_SIMULATE_ON_ERROR=true

# Type of simulation to use (success or noMatch)
SIMULATION_MODE=success
```

### Simulation Modes

- `success`: Simulates a successful check verification
- `noMatch`: Simulates a "No Match" response

This allows your application to continue testing and development even when the Treasury server is experiencing issues.

## Response Format

The API returns standardized JSON responses with this structure:

```json
{
  "success": true,
  "message": "Form submitted successfully",
  "data": {
    "verified": true,
    "status": "Check Verified",
    "details": "Status: Paid",
    "fullText": "Check Verified. Status: Paid",
    "alertType": "alert-success",
    "simulated": false,
    "submissionInfo": {
      "formData": {
        // Original form data
      },
      "hasResults": true
    }
  }
}
```

## License

[MIT](LICENSE)

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