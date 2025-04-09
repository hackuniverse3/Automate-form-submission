using System;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;

namespace TcvsIntegration
{
    public class TcvsApiClient
    {
        private readonly HttpClient _httpClient;
        private readonly string _baseUrl;

        /// <summary>
        /// Initializes a new instance of the TCVS API client
        /// </summary>
        /// <param name="baseUrl">Base URL of the API. Defaults to the Vercel deployment.</param>
        public TcvsApiClient(string baseUrl = "http://localhost:3000/api")
        {
            _httpClient = new HttpClient();
            _baseUrl = baseUrl;
        }

        /// <summary>
        /// Submits a form to the Treasury Check Verification System (TCVS)
        /// </summary>
        /// <param name="issueDate">Issue date in MM/DD/YYYY format</param>
        /// <param name="symbol">Check symbol (4 digits)</param>
        /// <param name="serial">Check serial number (8 digits)</param>
        /// <param name="checkAmount">Amount of the check (decimal number)</param>
        /// <param name="rtn">Bank routing transit number (9 digits)</param>
        /// <returns>The response from the TCVS API</returns>
        public async Task<TcvsResponse> SubmitTcvsFormAsync(
            string issueDate,
            string symbol,
            string serial,
            string checkAmount,
            string rtn)
        {
            try
            {
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
        public string CurrentUrl { get; set; }
        public string Result { get; set; }
    }

    // Example usage
    public class Program
    {
        public static async Task Main(string[] args)
        {
            // Create client with default URL (Vercel deployment)
            var client = new TcvsApiClient();
            
            // Check API health first
            var healthCheck = await client.CheckHealthAsync();
            if (healthCheck.Success)
            {
                Console.WriteLine($"API Health Check: {healthCheck.Message}");
            }
            else
            {
                Console.WriteLine($"API Health Check Failed: {healthCheck.Error}");
                return;
            }

            // Submit form to TCVS
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
        }
    }
} 