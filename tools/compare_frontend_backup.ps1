# Compare September 2025 backup with current front-end/src
# Generate CSV report for Excel

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
    
    $fileInfo = Get-Item $FilePath
    $size = $fileInfo.Length
    
    $lines = 0
    try {
        $content = Get-Content $FilePath -ErrorAction SilentlyContinue
        $lines = $content.Count
    } catch {
        $lines = 0
    }
    
    return @{ Size = $size; Lines = $lines }
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
    
    Get-ChildItem -Path $Directory -Recurse -File | ForEach-Object {
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

# Create CSV output
$outputDir = Split-Path -Parent $OutputFile
if (-not (Test-Path $outputDir)) {
    New-Item -ItemType Directory -Path $outputDir -Force | Out-Null
}

$csv = New-Object System.Collections.ArrayList

# Add header
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
$csv.Add(($header -join ",")) | Out-Null

# Files only in backup
foreach ($relPath in ($onlyInBackup | Sort-Object)) {
    $backupPath = $backupFiles[$relPath]
    $stats = Get-FileStats -FilePath $backupPath
    
    $row = @(
        """$relPath""",
        "Only in Backup",
        $stats.Size,
        $stats.Lines,
        0,
        0,
        -$stats.Size,
        -$stats.Lines,
        "-100%",
        """$backupPath""",
        ""
    )
    $csv.Add(($row -join ",")) | Out-Null
}

# Files only in current
foreach ($relPath in ($onlyInCurrent | Sort-Object)) {
    $currentPath = $currentFiles[$relPath]
    $stats = Get-FileStats -FilePath $currentPath
    
    $row = @(
        """$relPath""",
        "Only in Current",
        0,
        0,
        $stats.Size,
        $stats.Lines,
        $stats.Size,
        $stats.Lines,
        "100%",
        "",
        """$currentPath"""
    )
    $csv.Add(($row -join ",")) | Out-Null
}

# Files in both - compare
$modifiedCount = 0
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
        """$relPath""",
        $status,
        $backupStats.Size,
        $backupStats.Lines,
        $currentStats.Size,
        $currentStats.Lines,
        $sizeDiff,
        $linesDiff,
        $sizeChangePct,
        """$backupPath""",
        """$currentPath"""
    )
    $csv.Add(($row -join ",")) | Out-Null
}

# Write CSV file
$csv | Out-File -FilePath $OutputFile -Encoding UTF8

Write-Host "CSV report saved to: $OutputFile"
Write-Host ""
Write-Host "Summary:"
Write-Host "  Total files in backup: $($backupFiles.Count)"
Write-Host "  Total files in current: $($currentFiles.Count)"
Write-Host "  Files only in backup: $($onlyInBackup.Count)"
Write-Host "  Files only in current: $($onlyInCurrent.Count)"
Write-Host "  Files in both: $($inBoth.Count)"
Write-Host "  Modified files: $modifiedCount"
Write-Host "  Unchanged files: $($inBoth.Count - $modifiedCount)"
