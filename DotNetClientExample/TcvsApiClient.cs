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

        public TcvsApiClient(string baseUrl = "http://localhost:3000/api")
        {
            _httpClient = new HttpClient();
            _baseUrl = baseUrl;
        }

        public async Task<TcvsResponse> SubmitTcvsFormAsync(
            string issueDate,
            string symbol,
            string serial,
            string checkAmount,
            string rtn)
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

            var response = await _httpClient.PostAsync($"{_baseUrl}/submit", content);
            
            var responseString = await response.Content.ReadAsStringAsync();
            var result = JsonSerializer.Deserialize<TcvsResponse>(responseString, new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true
            });

            return result;
        }
    }

    public class TcvsResponse
    {
        public bool Success { get; set; }
        public string Message { get; set; }
        public dynamic Data { get; set; }
        public string Error { get; set; }
    }

    // Example usage
    public class Program
    {
        public static async Task Main(string[] args)
        {
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
        }
    }
} 