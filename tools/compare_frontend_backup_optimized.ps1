# Optimized comparison script - processes files in batches and writes incrementally

param(
    [string]$BackupDir = "09-25\src-9-30-25-working",
    [string]$CurrentDir = "front-end\src",
    [string]$OutputFile = "prod\docs\investigation.csv"
)

function Get-FileStats {
    param([string]$FilePath)
    
    if (-not (Test-Path $FilePath)) {
        return @{ Size = 0; Lines = 0 }
    }
    
    try {
        $fileInfo = Get-Item $FilePath -ErrorAction Stop
        $size = $fileInfo.Length
        
        $lines = 0
        try {
            $reader = [System.IO.StreamReader]::new($FilePath)
            while ($null -ne $reader.ReadLine()) { $lines++ }
            $reader.Close()
        } catch {
            $lines = 0
        }
        
        return @{ Size = $size; Lines = $lines }
    } catch {
        return @{ Size = 0; Lines = 0 }
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
    if ($Value -match '[,"]') {
        return '"' + ($Value -replace '"', '""') + '"'
    }
    return $Value
}

Write-Host "Comparing directories..."
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
    $stats = Get-FileStats -FilePath $backupPath
    
    $row = @(
        (Escape-Csv $relPath),
        "Only in Backup",
        $stats.Size,
        $stats.Lines,
        0,
        0,
        -$stats.Size,
        -$stats.Lines,
        "-100%",
        (Escape-Csv $backupPath),
        ""
    )
    $writer.WriteLine(($row -join ","))
    $totalProcessed++
    if ($totalProcessed % 100 -eq 0) {
        Write-Host "  Processed $totalProcessed files..."
    }
}

# Files only in current
Write-Host "Processing files only in current..."
foreach ($relPath in ($onlyInCurrent | Sort-Object)) {
    $currentPath = $currentFiles[$relPath]
    $stats = Get-FileStats -FilePath $currentPath
    
    $row = @(
        (Escape-Csv $relPath),
        "Only in Current",
        0,
        0,
        $stats.Size,
        $stats.Lines,
        $stats.Size,
        $stats.Lines,
        "100%",
        "",
        (Escape-Csv $currentPath)
    )
    $writer.WriteLine(($row -join ","))
    $totalProcessed++
    if ($totalProcessed % 100 -eq 0) {
        Write-Host "  Processed $totalProcessed files..."
    }
}

# Files in both - compare
Write-Host "Processing files in both directories..."
foreach ($relPath in ($inBoth | Sort-Object)) {
    $backupPath = $backupFiles[$relPath]
    $currentPath = $currentFiles[$relPath]
    
    $backupStats = Get-FileStats -FilePath $backupPath
    $currentStats = Get-FileStats -FilePath $currentPath
    
    $sizeDiff = $currentStats.Size - $backupStats.Size
    $linesDiff = $currentStats.Lines - $backupStats.Lines
    
    if ($backupStats.Size -gt 0) {
        $sizeChangePct = "{0:N1}%" -f (($sizeDiff / $backupStats.Size) * 100)
    } else {
        $sizeChangePct = if ($currentStats.Size -eq 0) { "N/A" } else { "100%" }
    }
    
    $status = if ($sizeDiff -ne 0 -or $linesDiff -ne 0) { "Modified" } else { "Unchanged" }
    if ($status -eq "Modified") { $modifiedCount++ }
    
    $row = @(
        (Escape-Csv $relPath),
        $status,
        $backupStats.Size,
        $backupStats.Lines,
        $currentStats.Size,
        $currentStats.Lines,
        $sizeDiff,
        $linesDiff,
        $sizeChangePct,
        (Escape-Csv $backupPath),
        (Escape-Csv $currentPath)
    )
    $writer.WriteLine(($row -join ","))
    $totalProcessed++
    if ($totalProcessed % 100 -eq 0) {
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
