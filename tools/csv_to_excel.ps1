# Convert CSV to Excel format using COM object (no external dependencies)

param(
    [string]$CsvFile = "prod\docs\investigation.csv",
    [string]$ExcelFile = "prod\docs\investigation.xlsx"
)

if (-not (Test-Path $CsvFile)) {
    Write-Error "CSV file not found: $CsvFile"
    exit 1
}

Write-Host "Converting CSV to Excel..."
Write-Host "  Input: $CsvFile"
Write-Host "  Output: $ExcelFile"

try {
    # Create Excel COM object
    $excel = New-Object -ComObject Excel.Application
    $excel.Visible = $false
    $excel.DisplayAlerts = $false
    
    # Open CSV file
    $workbook = $excel.Workbooks.Open((Resolve-Path $CsvFile).Path, $false, $true)
    $worksheet = $workbook.Worksheets.Item(1)
    
    # Auto-fit columns
    $usedRange = $worksheet.UsedRange
    $usedRange.Columns.AutoFit() | Out-Null
    
    # Format header row
    $headerRow = $worksheet.Rows.Item(1)
    $headerRow.Font.Bold = $true
    $headerRow.Interior.ColorIndex = 23  # Light blue
    $headerRow.Font.ColorIndex = 2  # White
    
    # Add conditional formatting for Status column (column B)
    $statusCol = 2
    $lastRow = $usedRange.Rows.Count
    
    for ($row = 2; $row -le $lastRow; $row++) {
        $statusCell = $worksheet.Cells.Item($row, $statusCol)
        $status = $statusCell.Value2
        
        if ($status -eq "Only in Backup") {
            $statusCell.Interior.ColorIndex = 3  # Light red
        } elseif ($status -eq "Only in Current") {
            $statusCell.Interior.ColorIndex = 8  # Light blue
        } elseif ($status -eq "Modified") {
            $statusCell.Interior.ColorIndex = 6  # Light yellow
        }
    }
    
    # Create output directory if needed
    $outputDir = Split-Path -Parent $ExcelFile
    if (-not (Test-Path $outputDir)) {
        New-Item -ItemType Directory -Path $outputDir -Force | Out-Null
    }
    
    # Save as Excel file
    $excelPath = (Resolve-Path (Split-Path -Parent $ExcelFile)).Path + "\" + (Split-Path -Leaf $ExcelFile)
    $workbook.SaveAs($excelPath, 51)  # 51 = xlOpenXMLWorkbook (.xlsx)
    
    # Close and cleanup
    $workbook.Close($false)
    $excel.Quit()
    [System.Runtime.Interopservices.Marshal]::ReleaseComObject($excel) | Out-Null
    
    Write-Host ""
    Write-Host "Excel file created successfully: $ExcelFile"
    
} catch {
    Write-Error "Error converting CSV to Excel: $_"
    exit 1
}
