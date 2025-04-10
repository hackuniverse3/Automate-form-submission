using System;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using System.Windows.Forms; // Add Windows Forms for UI components
using System.Collections.Generic;

namespace TcvsIntegration
{
    public class TcvsApiClient
    {
        private readonly HttpClient _httpClient;
        private readonly string _baseUrl;
        private bool _enableVerification = true; // Flag to enable/disable verification

        /// <summary>
        /// Initializes a new instance of the TCVS API client
        /// </summary>
        /// <param name="baseUrl">Base URL of the API. Defaults to the Vercel deployment.</param>
        /// <param name="enableVerification">Whether to show verification dialog before submission</param>
        public TcvsApiClient(string baseUrl = "http://localhost:3000/api", bool enableVerification = true)
        {
            _httpClient = new HttpClient();
            _baseUrl = baseUrl;
            _enableVerification = enableVerification;
        }

        /// <summary>
        /// Submits a form to the Treasury Check Verification System (TCVS) with user verification
        /// </summary>
        /// <param name="issueDate">Issue date in MM/DD/YYYY format</param>
        /// <param name="symbol">Check symbol (4 digits)</param>
        /// <param name="serial">Check serial number (8 digits)</param>
        /// <param name="checkAmount">Amount of the check (decimal number)</param>
        /// <param name="rtn">Bank routing transit number (9 digits)</param>
        /// <returns>The response from the TCVS API or null if user cancelled</returns>
        public async Task<TcvsResponse> SubmitTcvsFormAsync(
            string issueDate,
            string symbol,
            string serial,
            string checkAmount,
            string rtn)
        {
            try
            {
                // Show verification dialog if enabled
                if (_enableVerification)
                {
                    bool verified = ShowVerificationDialog(issueDate, symbol, serial, checkAmount, rtn);
                    if (!verified)
                    {
                        // User cancelled the verification
                        return new TcvsResponse
                        {
                            Success = false,
                            Message = "Form submission cancelled by user during verification"
                        };
                    }
                }

                var formData = new
                {
                    issueDate,
                    symbol,
                    serial,
                    checkAmount,
                    rtn
                };

                var content = new StringContent(
                    JsonSerializer.Serialize(formData),
                    Encoding.UTF8,
                    "application/json");

                // Set a reasonable timeout since the API uses browser automation
                _httpClient.Timeout = TimeSpan.FromMinutes(2);

                var response = await _httpClient.PostAsync($"{_baseUrl}/submit", content);
                
                var responseString = await response.Content.ReadAsStringAsync();
                
                var options = new JsonSerializerOptions
                {
                    PropertyNameCaseInsensitive = true
                };
                
                var result = JsonSerializer.Deserialize<TcvsResponse>(responseString, options);

                return result;
            }
            catch (Exception ex)
            {
                // Return a friendly error response
                return new TcvsResponse
                {
                    Success = false,
                    Message = "An error occurred while communicating with the TCVS API",
                    Error = ex.Message
                };
            }
        }

        /// <summary>
        /// Displays a dialog for the user to verify the check information before submission
        /// </summary>
        /// <returns>True if the user confirmed, false if cancelled</returns>
        private bool ShowVerificationDialog(string issueDate, string symbol, string serial, string checkAmount, string rtn)
        {
            // Create verification message
            string message = "Please verify the check information before submission:\n\n" +
                $"Issue Date: {issueDate}\n" +
                $"Symbol: {symbol}\n" +
                $"Serial Number: {serial}\n" +
                $"Check Amount: ${checkAmount}\n" +
                $"RTN: {rtn}\n\n" +
                "Is this information correct?";

            // Show dialog and return result
            DialogResult result = MessageBox.Show(
                message,
                "Verify Check Information",
                MessageBoxButtons.YesNo,
                MessageBoxIcon.Question);

            return result == DialogResult.Yes;
        }

        /// <summary>
        /// Checks the health of the TCVS API
        /// </summary>
        /// <returns>Health check response</returns>
        public async Task<TcvsResponse> CheckHealthAsync()
        {
            try
            {
                var response = await _httpClient.GetAsync($"{_baseUrl}/health");
                var responseString = await response.Content.ReadAsStringAsync();
                
                var options = new JsonSerializerOptions
                {
                    PropertyNameCaseInsensitive = true
                };
                
                var result = JsonSerializer.Deserialize<TcvsResponse>(responseString, options);
                
                return result;
            }
            catch (Exception ex)
            {
                return new TcvsResponse
                {
                    Success = false,
                    Message = "Health check failed",
                    Error = ex.Message
                };
            }
        }
    }

    /// <summary>
    /// Response from the TCVS API
    /// </summary>
    public class TcvsResponse
    {
        public bool Success { get; set; }
        public string Message { get; set; }
        public TcvsResponseData Data { get; set; }
        public string Error { get; set; }
    }

    /// <summary>
    /// Data returned in the TCVS API response
    /// </summary>
    public class TcvsResponseData
    {
        /// <summary>
        /// The URL of the result page
        /// </summary>
        public string CurrentUrl { get; set; }
        
        /// <summary>
        /// Whether the check was verified successfully
        /// </summary>
        public bool Verified { get; set; }
        
        /// <summary>
        /// The verification status text (e.g., "Check Verified" or "No Match")
        /// </summary>
        public string Status { get; set; }
        
        /// <summary>
        /// Additional details about the verification (can be a string or dictionary)
        /// </summary>
        public object Details { get; set; }
        
        /// <summary>
        /// The full text of the verification result
        /// </summary>
        public string FullText { get; set; }
        
        /// <summary>
        /// The type of alert (e.g., "alert-danger", "alert-success")
        /// </summary>
        public string AlertType { get; set; }

        /// <summary>
        /// Gets a user-friendly display of the verification result
        /// </summary>
        public override string ToString()
        {
            var sb = new System.Text.StringBuilder();
            
            // First line shows verification status
            sb.AppendLine($"Verification Result: {(Verified ? "VERIFIED" : "NOT VERIFIED")}");
            sb.AppendLine();
            
            // Show the specific status if available
            if (!string.IsNullOrEmpty(Status))
            {
                sb.AppendLine($"Status: {Status}");
            }
            
            // Show details based on type
            if (Details != null)
            {
                if (Details is Dictionary<string, string> detailsDict)
                {
                    sb.AppendLine("Details:");
                    foreach (var detail in detailsDict)
                    {
                        sb.AppendLine($"  {detail.Key}: {detail.Value}");
                    }
                }
                else
                {
                    sb.AppendLine($"Details: {Details}");
                }
                sb.AppendLine();
            }
            
            // Show the full text if available
            if (!string.IsNullOrEmpty(FullText))
            {
                sb.AppendLine("Full Result:");
                sb.AppendLine(FullText);
            }
            
            return sb.ToString();
        }
    }

    // Example usage
    public class Program
    {
        public static async Task Main(string[] args)
        {
            try
            {
                // Simulate reading data from card reader
                Console.WriteLine("Simulating card reader scan...");
                string issueDate = "12/06/24";
                string symbol = "4045";
                string serial = "57285965";
                string checkAmount = "10.00";
                string rtn = "000000518";
                Console.WriteLine("Check data read successfully.");

                // Create client with default URL (Vercel deployment) and verification enabled
                var client = new TcvsApiClient(enableVerification: true);
                
                // Check API health first
                var healthCheck = await client.CheckHealthAsync();
                if (!healthCheck.Success)
                {
                    Console.WriteLine($"API Health Check Failed: {healthCheck.Error}");
                    Console.WriteLine("Press any key to exit...");
                    Console.ReadKey();
                    return;
                }

                // Submit form to TCVS (will show verification dialog)
                var result = await client.SubmitTcvsFormAsync(
                    issueDate: issueDate,
                    symbol: symbol,
                    serial: serial,
                    checkAmount: checkAmount,
                    rtn: rtn
                );

                if (result.Success)
                {
                    Console.WriteLine($"Form submission successful: {result.Message}");
                    Console.WriteLine($"Result URL: {result.Data?.CurrentUrl}");
                    Console.WriteLine($"Result content: {result.Data?.ResultText}");
                }
                else
                {
                    Console.WriteLine($"Form submission failed: {result.Error ?? result.Message}");
                }

                Console.WriteLine("Press any key to exit...");
                Console.ReadKey();
            }
            catch (Exception ex)
            {
                Console.WriteLine($"An unexpected error occurred: {ex.Message}");
                Console.WriteLine("Press any key to exit...");
                Console.ReadKey();
            }
        }
    }
} 