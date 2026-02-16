# Fast comparison - skips line counting for speed, focuses on file existence and size

param(
    [string]$BackupDir = "09-25\src-9-30-25-working",
    [string]$CurrentDir = "front-end\src",
    [string]$OutputFile = "prod\docs\investigation.csv"
)

function Get-FileSize {
    param([string]$FilePath)
    
    if (-not (Test-Path $FilePath)) {
        return 0
    }
    
    try {
        return (Get-Item $FilePath -ErrorAction Stop).Length
    } catch {
        return 0
    }
}

function Get-RelativePath {
    param([string]$FullPath, [string]$BasePath)
    
    $full = [System.IO.Path]::GetFullPath($FullPath)
    $base = [System.IO.Path]::GetFullPath($BasePath)
    
    if ($full.StartsWith($base)) {
        return $full.Substring($base.Length).TrimStart('\', '/')
    }
    
    return $FullPath
}

function Scan-Directory {
    param([string]$Directory)
    
    $files = @{}
    $basePath = Resolve-Path $Directory
    
    $excludeDirs = @('node_modules', '.git', 'dist', 'build', '.next')
    
    Get-ChildItem -Path $Directory -Recurse -File -ErrorAction SilentlyContinue | ForEach-Object {
        $fullPath = $_.FullName
        $relPath = Get-RelativePath -FullPath $fullPath -BasePath $basePath
        
        # Skip if in excluded directory
        $skip = $false
        foreach ($exclude in $excludeDirs) {
            if ($fullPath -like "*\$exclude\*" -or $fullPath -like "*/$exclude/*") {
                $skip = $true
                break
            }
        }
        
        if (-not $skip) {
            $files[$relPath] = $fullPath
        }
    }
    
    return $files
}

function Escape-Csv {
    param([string]$Value)
    if ($null -eq $Value) { return "" }
    $val = $Value.ToString()
    if ($val -match '[,"]') {
        return '"' + ($val -replace '"', '""') + '"'
    }
    return $val
}

Write-Host "Fast comparison (size only, no line counting)..."
Write-Host "  Backup: $BackupDir"
Write-Host "  Current: $CurrentDir"
Write-Host "  Output: $OutputFile"
Write-Host ""

# Scan directories
Write-Host "Scanning backup directory..."
$backupFiles = Scan-Directory -Directory $BackupDir
Write-Host "Found $($backupFiles.Count) files in backup"

Write-Host "Scanning current directory..."
$currentFiles = Scan-Directory -Directory $CurrentDir
Write-Host "Found $($currentFiles.Count) files in current"
Write-Host ""

# Categorize files
$onlyInBackup = $backupFiles.Keys | Where-Object { $currentFiles.Keys -notcontains $_ }
$onlyInCurrent = $currentFiles.Keys | Where-Object { $backupFiles.Keys -notcontains $_ }
$inBoth = $backupFiles.Keys | Where-Object { $currentFiles.Keys -contains $_ }

Write-Host "Comparison Summary:"
Write-Host "  Only in backup: $($onlyInBackup.Count)"
Write-Host "  Only in current: $($onlyInCurrent.Count)"
Write-Host "  In both: $($inBoth.Count)"
Write-Host ""

# Create output directory
$outputDir = Split-Path -Parent $OutputFile
if (-not (Test-Path $outputDir)) {
    New-Item -ItemType Directory -Path $outputDir -Force | Out-Null
}

# Create CSV file with UTF-8 BOM for Excel compatibility
$utf8Bom = [System.Text.Encoding]::UTF8.GetPreamble()
$stream = [System.IO.File]::Create($OutputFile)
$stream.Write($utf8Bom, 0, $utf8Bom.Length)
$writer = New-Object System.IO.StreamWriter($stream, [System.Text.Encoding]::UTF8)

# Write header
$header = @(
    "File Path",
    "Status",
    "Backup Size (bytes)",
    "Backup Lines",
    "Current Size (bytes)",
    "Current Lines",
    "Size Diff (bytes)",
    "Lines Diff",
    "Size Change %",
    "Backup Path",
    "Current Path"
)
$writer.WriteLine(($header -join ","))

$totalProcessed = 0
$modifiedCount = 0

# Files only in backup
Write-Host "Processing files only in backup..."
foreach ($relPath in ($onlyInBackup | Sort-Object)) {
    $backupPath = $backupFiles[$relPath]
    $size = Get-FileSize -FilePath $backupPath
    
    $row = @(
        (Escape-Csv $relPath),
        "Only in Backup",
        $size,
        "N/A",
        0,
        "N/A",
        -$size,
        "N/A",
        "-100%",
        (Escape-Csv $backupPath),
        ""
    )
    $writer.WriteLine(($row -join ","))
    $totalProcessed++
    if ($totalProcessed % 500 -eq 0) {
        Write-Host "  Processed $totalProcessed files..."
    }
}

# Files only in current
Write-Host "Processing files only in current..."
foreach ($relPath in ($onlyInCurrent | Sort-Object)) {
    $currentPath = $currentFiles[$relPath]
    $size = Get-FileSize -FilePath $currentPath
    
    $row = @(
        (Escape-Csv $relPath),
        "Only in Current",
        0,
        "N/A",
        $size,
        "N/A",
        $size,
        "N/A",
        "100%",
        "",
        (Escape-Csv $currentPath)
    )
    $writer.WriteLine(($row -join ","))
    $totalProcessed++
    if ($totalProcessed % 500 -eq 0) {
        Write-Host "  Processed $totalProcessed files..."
    }
}

# Files in both - compare
Write-Host "Processing files in both directories..."
foreach ($relPath in ($inBoth | Sort-Object)) {
    $backupPath = $backupFiles[$relPath]
    $currentPath = $currentFiles[$relPath]
    
    $backupSize = Get-FileSize -FilePath $backupPath
    $currentSize = Get-FileSize -FilePath $currentPath
    
    $sizeDiff = $currentSize - $backupSize
    
    if ($backupSize -gt 0) {
        $sizeChangePct = "{0:N1}%" -f (($sizeDiff / $backupSize) * 100)
    } else {
        $sizeChangePct = if ($currentSize -eq 0) { "N/A" } else { "100%" }
    }
    
    $status = if ($sizeDiff -ne 0) { "Modified" } else { "Unchanged" }
    if ($status -eq "Modified") { $modifiedCount++ }
    
    $row = @(
        (Escape-Csv $relPath),
        $status,
        $backupSize,
        "N/A",
        $currentSize,
        "N/A",
        $sizeDiff,
        "N/A",
        $sizeChangePct,
        (Escape-Csv $backupPath),
        (Escape-Csv $currentPath)
    )
    $writer.WriteLine(($row -join ","))
    $totalProcessed++
    if ($totalProcessed % 500 -eq 0) {
        Write-Host "  Processed $totalProcessed files..."
    }
}

$writer.Close()
$stream.Close()

Write-Host ""
Write-Host "CSV report saved to: $OutputFile"
Write-Host ""
Write-Host "Final Summary:"
Write-Host "  Total files processed: $totalProcessed"
Write-Host "  Total files in backup: $($backupFiles.Count)"
Write-Host "  Total files in current: $($currentFiles.Count)"
Write-Host "  Files only in backup: $($onlyInBackup.Count)"
Write-Host "  Files only in current: $($onlyInCurrent.Count)"
Write-Host "  Files in both: $($inBoth.Count)"
Write-Host "  Modified files: $modifiedCount"
Write-Host "  Unchanged files: $($inBoth.Count - $modifiedCount)"
Write-Host ""
Write-Host "Note: Line counts are marked as 'N/A' for speed. Run full comparison script for line counts."
