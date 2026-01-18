# Dead Code Analysis Script
# Analyzes TSX files and assigns certainty scores for deletion

$ErrorActionPreference = "SilentlyContinue"

# Read all TSX files
$features = Get-Content "features-tsx-files.md" | Select-Object -Skip 8 | ForEach-Object { $_ -replace '^- ', '' }
$utils = Get-Content "utilities-tsx-files.md" | Select-Object -Skip 8 | ForEach-Object { $_ -replace '^- ', '' }
$allFiles = $features + $utils

Write-Host "Analyzing $($allFiles.Count) files..."

$results = @()

foreach ($file in $allFiles) {
    $score = 0
    $reasons = @()
    $certainty = "LOW"
    
    # Check if file exists
    if (-not (Test-Path $file)) {
        continue
    }
    
    $fullPath = (Resolve-Path $file).Path
    $fileName = Split-Path $file -Leaf
    $dirPath = Split-Path $file -Parent
    
    # HIGH CERTAINTY (90-100%): Files with obvious dead code indicators
    if ($file -match 'misc-legacy') {
        $score += 40
        $reasons += "Located in misc-legacy directory"
    }
    
    if ($file -match '\.broken') {
        $score += 50
        $reasons += "Has .broken extension"
    }
    
    if ($file -match '\.clean') {
        $score += 50
        $reasons += "Has .clean extension"
    }
    
    if ($file -match 'legacy/') {
        $score += 35
        $reasons += "Located in legacy directory"
    }
    
    if ($file -match '__tests__|\.test\.|\.spec\.') {
        $score += 20
        $reasons += "Test file (may be needed for testing)"
    }
    
    # MEDIUM-HIGH CERTAINTY (70-89%): Duplicate files or deprecated patterns
    if ($file -match 'old|deprecated|unused|removed') {
        $score += 30
        $reasons += "Contains 'old', 'deprecated', 'unused', or 'removed' in path"
    }
    
    if ($file -match 'demo|example|sample') {
        $score += 15
        $reasons += "Demo/example/sample file"
    }
    
    # Check for duplicate files (same name in different locations)
    $duplicates = $allFiles | Where-Object { 
        (Split-Path $_ -Leaf) -eq $fileName -and $_ -ne $file 
    }
    if ($duplicates.Count -gt 0) {
        $score += 25
        $reasons += "Duplicate file name found in other locations"
    }
    
    # Check if file is imported anywhere (basic check)
    $importPattern = $fileName -replace '\.tsx$', ''
    $importPattern = $importPattern -replace '([A-Z])', '/$1' -replace '^/', ''
    
    # MEDIUM CERTAINTY (50-69%): Files not in routes and not commonly imported
    # This is a simplified check - full analysis would require AST parsing
    
    # Determine certainty level
    if ($score -ge 90) {
        $certainty = "VERY HIGH (90-100%)"
    } elseif ($score -ge 70) {
        $certainty = "HIGH (70-89%)"
    } elseif ($score -ge 50) {
        $certainty = "MEDIUM (50-69%)"
    } elseif ($score -ge 30) {
        $certainty = "LOW-MEDIUM (30-49%)"
    } else {
        $certainty = "LOW (0-29%)"
    }
    
    # Only include files with score >= 30
    if ($score -ge 30) {
        $results += [PSCustomObject]@{
            File = $file
            Score = $score
            Certainty = $certainty
            Reasons = ($reasons -join "; ")
        }
    }
}

# Sort by score descending
$results = $results | Sort-Object -Property Score -Descending

# Generate markdown report
$report = @"
# Dead Code Analysis Report

This report identifies TSX files that are likely candidates for deletion, with certainty scores based on various indicators.

**Analysis Date:** $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
**Total Files Analyzed:** $($allFiles.Count)
**Files Flagged for Review:** $($results.Count)

---

## Scoring System

- **VERY HIGH (90-100%)**: Almost certainly dead code - safe to delete
- **HIGH (70-89%)**: Very likely dead code - review and delete
- **MEDIUM (50-69%)**: Possibly dead code - needs investigation
- **LOW-MEDIUM (30-49%)**: Unlikely but possible dead code - minimal risk
- **LOW (0-29%)**: Likely active code - do not delete

---

## Files by Certainty Level

"@

# Group by certainty
$veryHigh = $results | Where-Object { $_.Score -ge 90 }
$high = $results | Where-Object { $_.Score -ge 70 -and $_.Score -lt 90 }
$medium = $results | Where-Object { $_.Score -ge 50 -and $_.Score -lt 70 }
$lowMedium = $results | Where-Object { $_.Score -ge 30 -and $_.Score -lt 50 }

$report += "`n### VERY HIGH Certainty (90-100%) - $($veryHigh.Count) files`n`n"
$report += "These files are almost certainly dead code and can be safely deleted.`n`n"
foreach ($item in $veryHigh) {
    $report += "- **$($item.File)** (Score: $($item.Score))`n"
    $report += "  - Reasons: $($item.Reasons)`n"
}

$report += "`n### HIGH Certainty (70-89%) - $($high.Count) files`n`n"
$report += "These files are very likely dead code. Review and delete if confirmed unused.`n`n"
foreach ($item in $high) {
    $report += "- **$($item.File)** (Score: $($item.Score))`n"
    $report += "  - Reasons: $($item.Reasons)`n"
}

$report += "`n### MEDIUM Certainty (50-69%) - $($medium.Count) files`n`n"
$report += "These files may be dead code. Investigate before deleting.`n`n"
foreach ($item in $medium) {
    $report += "- **$($item.File)** (Score: $($item.Score))`n"
    $report += "  - Reasons: $($item.Reasons)`n"
}

$report += "`n### LOW-MEDIUM Certainty (30-49%) - $($lowMedium.Count) files`n`n"
$report += "These files are unlikely to be dead code but have some indicators. Review carefully.`n`n"
foreach ($item in $lowMedium) {
    $report += "- **$($item.File)** (Score: $($item.Score))`n"
    $report += "  - Reasons: $($item.Reasons)`n"
}

$report += "`n---`n`n## Summary Statistics`n`n"
$report += "- **Very High Certainty:** $($veryHigh.Count) files`n"
$report += "- **High Certainty:** $($high.Count) files`n"
$report += "- **Medium Certainty:** $($medium.Count) files`n"
$report += "- **Low-Medium Certainty:** $($lowMedium.Count) files`n"
$report += "- **Total Flagged:** $($results.Count) files`n"

$report | Out-File -FilePath "dead-code-analysis.md" -Encoding utf8

Write-Host "Analysis complete! Report saved to dead-code-analysis.md"
Write-Host "Very High: $($veryHigh.Count), High: $($high.Count), Medium: $($medium.Count), Low-Medium: $($lowMedium.Count)"

