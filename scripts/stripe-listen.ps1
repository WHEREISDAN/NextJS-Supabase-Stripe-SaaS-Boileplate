# Create a new PowerShell script (stripe-listen.ps1)
New-Item -Path "scripts" -Name "stripe-listen.ps1" -ItemType "file" -Value @'
# Check if Stripe CLI is installed
if (!(Get-Command stripe -ErrorAction SilentlyContinue)) {
    Write-Host "Stripe CLI is not installed. Please install it first:"
    Write-Host "Using Chocolatey: choco install stripe-cli"
    Write-Host "Or download from: https://github.com/stripe/stripe-cli/releases/latest"
    exit 1
}

# Start webhook forwarding
Write-Host "Starting Stripe webhook forwarding..."
stripe listen --forward-to localhost:3000/api/webhooks/stripe
'@
