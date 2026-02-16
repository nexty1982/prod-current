# Wait for CSV file to be unlocked, then convert to Excel

param(
    [string]$CsvFile = "prod\docs\investigation.csv",
    [string]$ExcelFile = "prod\docs\investigation.xlsx",
    [int]$MaxWaitMinutes = 10
)

$csvPath = Resolve-Path (Split-Path -Parent $CsvFile).ToString() + "\" + (Split-Path -Leaf $CsvFile) -ErrorAction SilentlyContinue
if (-not $csvPath) {
    $csvPath = Join-Path (Get-Location) $CsvFile
}

Write-Host "Waiting for CSV file to be ready: $csvPath"
Write-Host "Max wait time: $MaxWaitMinutes minutes"
Write-Host ""

$startTime = Get-Date
$fileReady = $false

while (-not $fileReady -and ((Get-Date) - $startTime).TotalMinutes -lt $MaxWaitMinutes) {
    if (Test-Path $csvPath) {
        try {
            $file = Get-Item $csvPath
            $sizeMB = [math]::Round($file.Length / 1MB, 2)
            $age = (Get-Date) - $file.LastWriteTime
            
            Write-Host "File exists: $sizeMB MB, Age: $([math]::Round($age.TotalSeconds, 0)) seconds" -NoNewline
            
            # Try to open file exclusively to check if it's locked
            try {
                $stream = [System.IO.File]::Open($csvPath, 'Open', 'Read', 'None')
                $stream.Close()
                $fileReady = $true
                Write-Host " - File is ready!"
            } catch {
                Write-Host " - File is locked, waiting..."
                Start-Sleep -Seconds 5
            }
        } catch {
            Write-Host " - Error checking file, waiting..."
            Start-Sleep -Seconds 5
        }
    } else {
        Write-Host "File not found, waiting..."
        Start-Sleep -Seconds 5
    }
}

if (-not $fileReady) {
    Write-Warning "File did not become ready within $MaxWaitMinutes minutes. You may need to run the conversion manually."
    exit 1
}

Write-Host ""
Write-Host "Converting CSV to Excel..."

# Create output directory if needed
$outputDir = Split-Path -Parent $ExcelFile
if (-not (Test-Path $outputDir)) {
    New-Item -ItemType Directory -Path $outputDir -Force | Out-Null
}

try {
    # Create Excel COM object
    $excel = New-Object -ComObject Excel.Application
    $excel.Visible = $false
    $excel.DisplayAlerts = $false
    
    Write-Host "Opening CSV file..."
    # Open CSV file
    $workbook = $excel.Workbooks.Open($csvPath, $false, $true)
    $worksheet = $workbook.Worksheets.Item(1)
    
    Write-Host "Formatting worksheet..."
    # Auto-fit columns
    $usedRange = $worksheet.UsedRange
    $usedRange.Columns.AutoFit() | Out-Null
    
    # Format header row
    $headerRow = $worksheet.Rows.Item(1)
    $headerRow.Font.Bold = $true
    $headerRow.Interior.ColorIndex = 23  # Light blue
    $headerRow.Font.ColorIndex = 2  # White
    
    # Add conditional formatting for Status column (column B)
    Write-Host "Applying conditional formatting..."
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
        
        if ($row % 1000 -eq 0) {
            Write-Host "  Processed $row rows..."
        }
    }
    
    # Save as Excel file
    $excelPath = (Resolve-Path (Split-Path -Parent $ExcelFile)).Path + "\" + (Split-Path -Leaf $ExcelFile)
    Write-Host "Saving Excel file: $excelPath"
    $workbook.SaveAs($excelPath, 51)  # 51 = xlOpenXMLWorkbook (.xlsx)
    
    # Close and cleanup
    $workbook.Close($false)
    $excel.Quit()
    [System.Runtime.Interopservices.Marshal]::ReleaseComObject($excel) | Out-Null
    
    Write-Host ""
    Write-Host "✓ Excel file created successfully: $ExcelFile"
    Write-Host ""
    Write-Host "File statistics:"
    if (Test-Path $excelPath) {
        $excelFile = Get-Item $excelPath
        $excelSizeMB = [math]::Round($excelFile.Length / 1MB, 2)
        Write-Host "  Size: $excelSizeMB MB"
        Write-Host "  Rows: $lastRow"
    }
    
} catch {
    Write-Error "Error converting CSV to Excel: $_"
    Write-Host ""
    Write-Host "You can open the CSV file directly in Excel: $csvPath"
    exit 1
}
