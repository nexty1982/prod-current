#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Scans for duplicate directories with similar names (e.g., frontend vs front-end)

.DESCRIPTION
    This script identifies directories that may be duplicates based on:
    - Similar names with different separators (hyphens, underscores, none)
    - Case variations
    - Common naming inconsistencies

.PARAMETER Path
    The root path to scan (defaults to current directory)

.PARAMETER Depth
    Maximum depth to scan (default: 2, meaning root + 1 level deep)

.EXAMPLE
    .\check-duplicate-directories.ps1 -Path Z:\
    
.EXAMPLE
    .\check-duplicate-directories.ps1 -Path Z:\ -Depth 3
#>

param(
    [string]$Path = ".",
    [int]$Depth = 2
)

# Known correct directory names (from the rule)
$KnownCorrect = @{
    "front-end" = "frontend"
    "backend" = "backend"
    "server" = "server"
    "services" = "services"
    "tools" = "tools"
    "docs" = "docs"
    "public" = "public"
    "config" = "config"
    "scripts" = "scripts"
}

# Function to normalize directory names for comparison
function Normalize-DirectoryName {
    param([string]$Name)
    
    # Remove hyphens, underscores, convert to lowercase
    $normalized = $Name -replace '[-_]', '' -replace '\s+', '' | ForEach-Object { $_.ToLower() }
    return $normalized
}

# Function to check if two directory names are similar
function Test-SimilarNames {
    param(
        [string]$Name1,
        [string]$Name2
    )
    
    $norm1 = Normalize-DirectoryName -Name $Name1
    $norm2 = Normalize-DirectoryName -Name $Name2
    
    # Exact match after normalization
    if ($norm1 -eq $norm2 -and $Name1 -ne $Name2) {
        return $true
    }
    
    # Check if one contains the other (with some tolerance)
    if ($norm1.Length -gt 3 -and $norm2.Length -gt 3) {
        if ($norm1.Contains($norm2) -or $norm2.Contains($norm1)) {
            # Check if they're at least 80% similar
            $shorter = if ($norm1.Length -lt $norm2.Length) { $norm1 } else { $norm2 }
            $longer = if ($norm1.Length -ge $norm2.Length) { $norm1 } else { $norm2 }
            $similarity = ($shorter.Length / $longer.Length)
            if ($similarity -ge 0.8) {
                return $true
            }
        }
    }
    
    return $false
}

Write-Host "Scanning for duplicate directories in: $Path" -ForegroundColor Cyan
Write-Host "Maximum depth: $Depth`n" -ForegroundColor Cyan

# Get all directories
$allDirs = @()
function Get-DirectoriesRecursive {
    param(
        [string]$CurrentPath,
        [int]$CurrentDepth
    )
    
    if ($CurrentDepth -gt $Depth) { return }
    
    try {
        $dirs = Get-ChildItem -Path $CurrentPath -Directory -ErrorAction SilentlyContinue
        foreach ($dir in $dirs) {
            $relativePath = $dir.FullName.Replace((Resolve-Path $Path).Path, "").TrimStart('\', '/')
            $allDirs += @{
                Name = $dir.Name
                FullPath = $dir.FullName
                RelativePath = if ($relativePath) { $relativePath } else { $dir.Name }
            }
            
            # Recurse if not at max depth
            if ($CurrentDepth -lt $Depth) {
                Get-DirectoriesRecursive -CurrentPath $dir.FullName -CurrentDepth ($CurrentDepth + 1)
            }
        }
    } catch {
        # Silently continue if we can't access a directory
    }
}

Get-DirectoriesRecursive -CurrentPath $Path -CurrentDepth 0

Write-Host "Found $($allDirs.Count) directories to analyze`n" -ForegroundColor Green

# Find potential duplicates
$duplicates = @()
$processed = @()

for ($i = 0; $i -lt $allDirs.Count; $i++) {
    $dir1 = $allDirs[$i]
    
    # Skip if already processed
    if ($processed -contains $dir1.Name) { continue }
    
    $similar = @()
    
    for ($j = $i + 1; $j -lt $allDirs.Count; $j++) {
        $dir2 = $allDirs[$j]
        
        if (Test-SimilarNames -Name1 $dir1.Name -Name2 $dir2.Name) {
            $similar += $dir2
        }
    }
    
    if ($similar.Count -gt 0) {
        $group = @($dir1) + $similar
        $duplicates += $group
        $processed += $group | ForEach-Object { $_.Name }
    }
}

# Report results
if ($duplicates.Count -eq 0) {
    Write-Host "✅ No duplicate directories found!" -ForegroundColor Green
    exit 0
}

Write-Host "⚠️  Found $($duplicates.Count) potential duplicate directory groups:`n" -ForegroundColor Yellow

$groupNum = 1
foreach ($group in $duplicates) {
    Write-Host "Group $groupNum : Similar directory names found" -ForegroundColor Yellow
    Write-Host ("=" * 60)
    
    foreach ($dir in $group) {
        $isKnownCorrect = $false
        $recommendation = ""
        
        # Check against known correct names
        foreach ($correctName in $KnownCorrect.Keys) {
            if ((Normalize-DirectoryName -Name $dir.Name) -eq (Normalize-DirectoryName -Name $correctName)) {
                if ($dir.Name -eq $correctName) {
                    $isKnownCorrect = $true
                    $recommendation = "✅ CORRECT"
                } else {
                    $recommendation = "❌ Should be: '$correctName'"
                }
                break
            }
        }
        
        if (-not $recommendation) {
            # Check if it's the prod directory issue
            if ($dir.Name -eq "prod" -and $dir.RelativePath -eq "prod") {
                $recommendation = "❌ REMOVE: Root Z:\ IS the prod directory (Samba share)"
            } else {
                $recommendation = "⚠️  Review needed"
            }
        }
        
        Write-Host "  • $($dir.RelativePath)" -ForegroundColor White
        Write-Host "    Full Path: $($dir.FullPath)" -ForegroundColor Gray
        Write-Host "    Status: $recommendation" -ForegroundColor $(if ($isKnownCorrect) { "Green" } else { "Red" })
        Write-Host ""
    }
    
    Write-Host ""
    $groupNum++
}

# Summary
Write-Host ("=" * 60)
Write-Host "Summary:" -ForegroundColor Cyan
Write-Host "  Total duplicate groups found: $($duplicates.Count)" -ForegroundColor White
Write-Host "`nRecommendations:" -ForegroundColor Cyan
Write-Host "  1. Review each group above" -ForegroundColor White
Write-Host "  2. Consolidate files from incorrect directories to correct ones" -ForegroundColor White
Write-Host "  3. Remove incorrect directories after verification" -ForegroundColor White
Write-Host "  4. Update any references to use the correct directory names" -ForegroundColor White
Write-Host ""

exit 1
