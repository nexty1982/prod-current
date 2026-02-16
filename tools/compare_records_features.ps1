# Compare records/baptism/marriage/funeral files between backup and current

param(
    [string]$BackupDir = "09-25\src-9-30-25-working\features",
    [string]$CurrentDir = "front-end\src\features",
    [string]$OutputFile = "prod\docs\missing_records_features.csv"
)

function Get-RelativePath {
    param([string]$FullPath, [string]$BasePath)
    
    $full = [System.IO.Path]::GetFullPath($FullPath)
    $base = [System.IO.Path]::GetFullPath($BasePath)
    
    if ($full.StartsWith($base)) {
        return $full.Substring($base.Length).TrimStart('\', '/')
    }
    
    return $FullPath
}

function Scan-RecordsFiles {
    param([string]$Directory)
    
    $files = @{}
    $basePath = Resolve-Path $Directory
    
    Get-ChildItem -Path $Directory -Recurse -File -ErrorAction SilentlyContinue | Where-Object {
        $name = $_.Name.ToLower()
        $dir = $_.DirectoryName.ToLower()
        $name -match "(records|baptism|marriage|funeral)" -or $dir -match "(records|baptism|marriage|funeral)"
    } | ForEach-Object {
        $relPath = Get-RelativePath -FullPath $_.FullName -BasePath $basePath
        $files[$relPath] = @{
            FullPath = $_.FullName
            Size = $_.Length
            Extension = $_.Extension
            LastWrite = $_.LastWriteTime
        }
    }
    
    return $files
}

Write-Host "Scanning records files in backup..."
$backupFiles = Scan-RecordsFiles -Directory $BackupDir
Write-Host "Found $($backupFiles.Count) records-related files in backup"

Write-Host "Scanning records files in current..."
$currentFiles = Scan-RecordsFiles -Directory $CurrentDir
Write-Host "Found $($currentFiles.Count) records-related files in current"
Write-Host ""

# Find files only in backup
$onlyInBackup = $backupFiles.Keys | Where-Object { $currentFiles.Keys -notcontains $_ }

Write-Host "Files only in backup: $($onlyInBackup.Count)"
Write-Host ""

# Create output directory
$outputDir = Split-Path -Parent $OutputFile
if (-not (Test-Path $outputDir)) {
    New-Item -ItemType Directory -Path $outputDir -Force | Out-Null
}

# Create CSV
$utf8Bom = [System.Text.Encoding]::UTF8.GetPreamble()
$stream = [System.IO.File]::Create($OutputFile)
$stream.Write($utf8Bom, 0, $utf8Bom.Length)
$writer = New-Object System.IO.StreamWriter($stream, [System.Text.Encoding]::UTF8)

# Header
$writer.WriteLine("File Path,Size (bytes),Extension,Last Modified,Full Path,Category")

# Categorize and write
$categories = @{
    "Baptism" = @()
    "Marriage" = @()
    "Funeral" = @()
    "Records Core" = @()
    "Records Apps" = @()
    "Records Centralized" = @()
    "Other Records" = @()
}

foreach ($relPath in ($onlyInBackup | Sort-Object)) {
    $file = $backupFiles[$relPath]
    $lowerPath = $relPath.ToLower()
    
    $category = "Other Records"
    if ($lowerPath -match "baptism") {
        $category = "Baptism"
    } elseif ($lowerPath -match "marriage") {
        $category = "Marriage"
    } elseif ($lowerPath -match "funeral") {
        $category = "Funeral"
    } elseif ($lowerPath -match "records-centralized") {
        $category = "Records Centralized"
    } elseif ($lowerPath -match "records\\apps") {
        $category = "Records Apps"
    } elseif ($lowerPath -match "records\\") {
        $category = "Records Core"
    }
    
    $categories[$category] += $relPath
    
    $row = @(
        """$relPath""",
        $file.Size,
        $file.Extension,
        $file.LastWrite.ToString("yyyy-MM-dd HH:mm:ss"),
        """$($file.FullPath)""",
        $category
    )
    $writer.WriteLine(($row -join ","))
}

$writer.Close()
$stream.Close()

Write-Host "Report saved to: $OutputFile"
Write-Host ""
Write-Host "Breakdown by category:"
foreach ($cat in $categories.Keys | Sort-Object) {
    $count = $categories[$cat].Count
    if ($count -gt 0) {
        Write-Host "  $cat : $count files"
    }
}
