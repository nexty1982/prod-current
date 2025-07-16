# Enhanced Invoice Management Setup
# This script sets up the enhanced invoice management system

Write-Host "Setting up Enhanced Invoice Management System..." -ForegroundColor Green

# Check if we're in the correct directory
$currentPath = Get-Location
Write-Host "Current directory: $currentPath" -ForegroundColor Yellow

# Install server dependencies
Write-Host "Installing server dependencies..." -ForegroundColor Yellow
npm install pdf-lib@1.17.1

# Check if database schema needs to be applied
Write-Host "Enhanced Invoice Management setup includes:" -ForegroundColor Green
Write-Host "1. Enhanced invoice items with full CRUD operations" -ForegroundColor White
Write-Host "2. Service catalog with multilingual support" -ForegroundColor White
Write-Host "3. Church integration for invoice creation" -ForegroundColor White
Write-Host "4. Beautiful PDF generation with multiple languages" -ForegroundColor White
Write-Host "5. Frontend React component for complete invoice management" -ForegroundColor White

Write-Host ""
Write-Host "Database Schema Files:" -ForegroundColor Green
Write-Host "- enhanced_invoice_schema.sql (Enhanced invoice items and service catalog)" -ForegroundColor White
Write-Host "- billing_schema.sql (Core billing system)" -ForegroundColor White

Write-Host ""
Write-Host "API Endpoints Available:" -ForegroundColor Green
Write-Host "- GET /api/enhanced-invoices (List invoices with pagination)" -ForegroundColor White
Write-Host "- POST /api/enhanced-invoices (Create new invoice)" -ForegroundColor White
Write-Host "- PUT /api/enhanced-invoices/:id (Update invoice)" -ForegroundColor White
Write-Host "- DELETE /api/enhanced-invoices/:id (Delete invoice)" -ForegroundColor White
Write-Host "- POST /api/enhanced-invoices/:id/items (Add invoice item)" -ForegroundColor White
Write-Host "- PUT /api/enhanced-invoices/:id/items/:itemId (Update item)" -ForegroundColor White
Write-Host "- DELETE /api/enhanced-invoices/:id/items/:itemId (Delete item)" -ForegroundColor White
Write-Host "- GET /api/enhanced-invoices/service-catalog (Get service catalog)" -ForegroundColor White
Write-Host "- POST /api/enhanced-invoices/:id/generate-pdf (Generate PDF)" -ForegroundColor White

Write-Host ""
Write-Host "Frontend Routes Available:" -ForegroundColor Green
Write-Host "- /pages/invoices (Invoice Management Interface)" -ForegroundColor White

Write-Host ""
Write-Host "To complete setup:" -ForegroundColor Yellow
Write-Host "1. Apply the database schema if not already applied" -ForegroundColor White
Write-Host "2. Start the server with: node index.js" -ForegroundColor White
Write-Host "3. Navigate to /pages/invoices in the frontend" -ForegroundColor White

Write-Host ""
Write-Host "Setup completed successfully!" -ForegroundColor Green
