using System;
using System.Drawing;
using System.Threading.Tasks;
using System.Windows.Forms;

namespace TcvsIntegration
{
    public class VerificationForm : Form
    {
        private TextBox txtIssueDate;
        private TextBox txtSymbol;
        private TextBox txtSerial;
        private TextBox txtCheckAmount;
        private TextBox txtRTN;
        private Button btnScan;
        private Button btnVerify;
        private Button btnCancel;
        private Label lblStatus;
        private TcvsApiClient apiClient;

        public VerificationForm()
        {
            InitializeComponents();
            apiClient = new TcvsApiClient(enableVerification: false); // We'll handle verification in this form
            CheckApiHealth();
        }

        private void InitializeComponents()
        {
            // Form settings
            this.Text = "TCVS Check Verification";
            this.Size = new Size(500, 400);
            this.FormBorderStyle = FormBorderStyle.FixedDialog;
            this.MaximizeBox = false;
            this.StartPosition = FormStartPosition.CenterScreen;

            // Labels
            var lblTitle = new Label
            {
                Text = "Treasury Check Verification System",
                Font = new Font("Arial", 14, FontStyle.Bold),
                Location = new Point(20, 20),
                Size = new Size(400, 30)
            };

            var lblIssueDate = new Label { Text = "Issue Date (MM/DD/YYYY):", Location = new Point(20, 70), Size = new Size(150, 20) };
            var lblSymbol = new Label { Text = "Symbol (4 digits):", Location = new Point(20, 100), Size = new Size(150, 20) };
            var lblSerial = new Label { Text = "Serial Number (8 digits):", Location = new Point(20, 130), Size = new Size(150, 20) };
            var lblCheckAmount = new Label { Text = "Check Amount ($):", Location = new Point(20, 160), Size = new Size(150, 20) };
            var lblRTN = new Label { Text = "RTN (9 digits):", Location = new Point(20, 190), Size = new Size(150, 20) };

            // Text boxes
            txtIssueDate = new TextBox { Location = new Point(180, 70), Size = new Size(150, 20) };
            txtSymbol = new TextBox { Location = new Point(180, 100), Size = new Size(150, 20) };
            txtSerial = new TextBox { Location = new Point(180, 130), Size = new Size(150, 20) };
            txtCheckAmount = new TextBox { Location = new Point(180, 160), Size = new Size(150, 20) };
            txtRTN = new TextBox { Location = new Point(180, 190), Size = new Size(150, 20) };

            // Buttons
            btnScan = new Button
            {
                Text = "Scan Check",
                Location = new Point(20, 230),
                Size = new Size(120, 30)
            };
            btnScan.Click += BtnScan_Click;

            btnVerify = new Button
            {
                Text = "Verify & Submit",
                Location = new Point(150, 230),
                Size = new Size(120, 30),
                Enabled = false
            };
            btnVerify.Click += BtnVerify_Click;

            btnCancel = new Button
            {
                Text = "Cancel",
                Location = new Point(280, 230),
                Size = new Size(120, 30)
            };
            btnCancel.Click += BtnCancel_Click;

            // Status label
            lblStatus = new Label
            {
                Text = "Ready. Click 'Scan Check' to start.",
                Location = new Point(20, 280),
                Size = new Size(450, 60),
                ForeColor = Color.Navy,
                Font = new Font("Arial", 10)
            };

            // Add controls to form
            this.Controls.Add(lblTitle);
            this.Controls.Add(lblIssueDate);
            this.Controls.Add(lblSymbol);
            this.Controls.Add(lblSerial);
            this.Controls.Add(lblCheckAmount);
            this.Controls.Add(lblRTN);
            this.Controls.Add(txtIssueDate);
            this.Controls.Add(txtSymbol);
            this.Controls.Add(txtSerial);
            this.Controls.Add(txtCheckAmount);
            this.Controls.Add(txtRTN);
            this.Controls.Add(btnScan);
            this.Controls.Add(btnVerify);
            this.Controls.Add(btnCancel);
            this.Controls.Add(lblStatus);
        }

        private async void CheckApiHealth()
        {
            lblStatus.Text = "Checking API connection...";
            try
            {
                var healthCheck = await apiClient.CheckHealthAsync();
                if (healthCheck.Success)
                {
                    lblStatus.Text = "API connection successful. Ready to process checks.";
                    lblStatus.ForeColor = Color.Green;
                }
                else
                {
                    lblStatus.Text = $"API connection failed: {healthCheck.Error}";
                    lblStatus.ForeColor = Color.Red;
                    btnScan.Enabled = false;
                }
            }
            catch (Exception ex)
            {
                lblStatus.Text = $"API connection error: {ex.Message}";
                lblStatus.ForeColor = Color.Red;
                btnScan.Enabled = false;
            }
        }

        private void BtnScan_Click(object sender, EventArgs e)
        {
            lblStatus.Text = "Scanning check... (simulating card reader)";
            lblStatus.ForeColor = Color.Navy;

            // Simulate card reader scanning with a small delay
            using (var timer = new Timer())
            {
                timer.Interval = 1500;
                timer.Tick += (s, args) =>
                {
                    timer.Stop();
                    // Populate fields with simulated scan data
                    txtIssueDate.Text = "04/10/2024";
                    txtSymbol.Text = "1234";
                    txtSerial.Text = "12345678";
                    txtCheckAmount.Text = "123.45";
                    txtRTN.Text = "123456789";

                    lblStatus.Text = "Check scanned successfully. Please verify the information and click 'Verify & Submit'.";
                    lblStatus.ForeColor = Color.Green;
                    btnVerify.Enabled = true;
                };
                timer.Start();
            }
        }

        private async void BtnVerify_Click(object sender, EventArgs e)
        {
            // Show verification dialog
            var message = "Please verify the check information before submission:\n\n" +
                $"Issue Date: {txtIssueDate.Text}\n" +
                $"Symbol: {txtSymbol.Text}\n" +
                $"Serial Number: {txtSerial.Text}\n" +
                $"Check Amount: ${txtCheckAmount.Text}\n" +
                $"RTN: {txtRTN.Text}\n\n" +
                "Is this information correct?";

            var result = MessageBox.Show(
                message,
                "Verify Check Information",
                MessageBoxButtons.YesNo,
                MessageBoxIcon.Question);

            if (result == DialogResult.Yes)
            {
                await SubmitForm();
            }
            else
            {
                lblStatus.Text = "Submission cancelled. You can edit the fields and try again.";
                lblStatus.ForeColor = Color.Navy;
            }
        }

        private async Task SubmitForm()
        {
            lblStatus.Text = "Submitting to TCVS...";
            lblStatus.ForeColor = Color.Navy;
            btnVerify.Enabled = false;
            btnScan.Enabled = false;

            try
            {
                var response = await apiClient.SubmitTcvsFormAsync(
                    issueDate: txtIssueDate.Text,
                    symbol: txtSymbol.Text,
                    serial: txtSerial.Text,
                    checkAmount: txtCheckAmount.Text,
                    rtn: txtRTN.Text
                );

                if (response.Success)
                {
                    lblStatus.Text = $"Check verified successfully!\nResult: {response.Data?.Result}";
                    lblStatus.ForeColor = Color.Green;

                    MessageBox.Show(
                        $"Check verification successful.\n\nResult: {response.Data?.Result}",
                        "Success",
                        MessageBoxButtons.OK,
                        MessageBoxIcon.Information);
                }
                else
                {
                    lblStatus.Text = $"Check verification failed: {response.Error ?? response.Message}";
                    lblStatus.ForeColor = Color.Red;

                    MessageBox.Show(
                        $"Check verification failed.\n\nError: {response.Error ?? response.Message}",
                        "Error",
                        MessageBoxButtons.OK,
                        MessageBoxIcon.Error);
                }
            }
            catch (Exception ex)
            {
                lblStatus.Text = $"Error: {ex.Message}";
                lblStatus.ForeColor = Color.Red;
                
                MessageBox.Show(
                    $"An error occurred: {ex.Message}",
                    "Error",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Error);
            }
            finally
            {
                btnScan.Enabled = true;
            }
        }

        private void BtnCancel_Click(object sender, EventArgs e)
        {
            this.Close();
        }

        // Main entry point for the application
        [STAThread]
        public static void Main()
        {
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);
            Application.Run(new VerificationForm());
        }
    }
} 