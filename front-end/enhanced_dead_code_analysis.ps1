# Enhanced Dead Code Analysis Script
# Checks for actual imports and route references

$ErrorActionPreference = "SilentlyContinue"

# Read all TSX files
$features = Get-Content "features-tsx-files.md" | Select-Object -Skip 8 | ForEach-Object { $_ -replace '^- ', '' }
$utils = Get-Content "utilities-tsx-files.md" | Select-Object -Skip 8 | ForEach-Object { $_ -replace '^- ', '' }
$allFiles = $features + $utils

Write-Host "Analyzing $($allFiles.Count) files for dead code..."

# Get all source files to search for imports
$allSourceFiles = Get-ChildItem -Path "src" -Recurse -Include "*.tsx","*.ts","*.jsx","*.js" -Exclude "*.test.*","*.spec.*" -File | 
    Where-Object { $_.FullName -notlike "*\node_modules\*" -and $_.FullName -notlike "*\legacy\*" }

Write-Host "Searching for imports in $($allSourceFiles.Count) source files..."

$results = @()
$checkedFiles = 0

foreach ($file in $allFiles) {
    $checkedFiles++
    if ($checkedFiles % 100 -eq 0) {
        Write-Host "Checked $checkedFiles / $($allFiles.Count) files..."
    }
    
    $score = 0
    $reasons = @()
    $certainty = "LOW"
    $isImported = $false
    $isInRoutes = $false
    
    # Check if file exists
    if (-not (Test-Path $file)) {
        continue
    }
    
    $fullPath = (Resolve-Path $file).Path
    $fileName = Split-Path $file -Leaf
    $baseName = $fileName -replace '\.tsx$', ''
    $dirPath = Split-Path $file -Parent
    
    # Convert file path to import pattern
    $importPath = $file -replace '^src\\', '' -replace '\\', '/' -replace '\.tsx$', ''
    $importPathAlias = "@/" + $importPath
    $importPathRelative = $importPath
    
    # Check if file is in misc-legacy
    $isMiscLegacy = $file -match 'misc-legacy'
    
    # Check if file is imported anywhere (excluding legacy directory)
    $importPatterns = @(
        "from ['`"]$importPath['`"]",
        "from ['`"]$importPathAlias['`"]",
        "import.*['`"]$importPath['`"]",
        "import.*['`"]$importPathAlias['`"]",
        "lazy\(\(\) => import\(['`"]$importPath['`"]",
        "lazy\(\(\) => import\(['`"]$importPathAlias['`"]",
        "require\(['`"]$importPath['`"]",
        "require\(['`"]$importPathAlias['`"]"
    )
    
    foreach ($pattern in $importPatterns) {
        $matches = $allSourceFiles | Select-String -Pattern $pattern -SimpleMatch:$false
        if ($matches) {
            $isImported = $true
            break
        }
    }
    
    # Check if in Router.tsx (excluding comments)
    if (Test-Path "src/routes/Router.tsx") {
        $routerContent = Get-Content "src/routes/Router.tsx" -Raw
        # Check for actual imports, not comments
        if ($routerContent -match "import.*$([regex]::Escape($baseName))" -and $routerContent -notmatch "//.*$([regex]::Escape($baseName))") {
            $isInRoutes = $true
        }
        if ($routerContent -match "lazy\(\(\) => import\(.*$([regex]::Escape($importPath))" -and $routerContent -notmatch "//.*$([regex]::Escape($importPath))") {
            $isInRoutes = $true
        }
    }
    
    # Check if in refactoredRegistry (but this is in legacy, so lower weight)
    if (Test-Path "src/legacy/routes/refactoredRegistry.ts") {
        $registryContent = Get-Content "src/legacy/routes/refactoredRegistry.ts" -Raw
        if ($registryContent -match [regex]::Escape($importPath)) {
            $score -= 10  # Being in legacy registry is actually a negative indicator
            $reasons += "Referenced in legacy refactoredRegistry (legacy code)"
        }
    }
    
    # HIGH CERTAINTY (90-100%): Files with obvious dead code indicators
    if ($file -match '\.broken') {
        $score += 50
        $reasons += "Has .broken extension"
    }
    
    if ($file -match '\.clean') {
        $score += 50
        $reasons += "Has .clean extension"
    }
    
    if ($isMiscLegacy) {
        $score += 40
        $reasons += "Located in misc-legacy directory"
        
        # If not imported and in misc-legacy, increase score
        if (-not $isImported -and -not $isInRoutes) {
            $score += 30
            $reasons += "Not imported anywhere (excluding legacy)"
        }
    }
    
    if ($file -match 'legacy/') {
        $score += 35
        $reasons += "Located in legacy directory"
    }
    
    # If file is imported, reduce score significantly
    if ($isImported) {
        $score -= 40
        $reasons += "IS IMPORTED (active code)"
    }
    
    if ($isInRoutes) {
        $score -= 50
        $reasons += "IS IN ROUTES (active code)"
    }
    
    # Test files - lower priority
    if ($file -match '__tests__|\.test\.|\.spec\.') {
        $score += 10  # Lower weight for test files
        $reasons += "Test file"
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
        $score += 20
        $reasons += "Duplicate file name found ($($duplicates.Count) duplicates)"
    }
    
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
    
    # Only include files with score >= 30 OR files in misc-legacy that aren't imported
    if ($score -ge 30 -or ($isMiscLegacy -and -not $isImported -and -not $isInRoutes)) {
        $results += [PSCustomObject]@{
            File = $file
            Score = $score
            Certainty = $certainty
            IsImported = $isImported
            IsInRoutes = $isInRoutes
            Reasons = ($reasons -join "; ")
        }
    }
}

# Sort by score descending
$results = $results | Sort-Object -Property Score -Descending

# Generate markdown report
$report = @"
# Enhanced Dead Code Analysis Report

This report identifies TSX files that are likely candidates for deletion, with certainty scores based on various indicators including actual import analysis.

**Analysis Date:** $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
**Total Files Analyzed:** $($allFiles.Count)
**Source Files Checked for Imports:** $($allSourceFiles.Count)
**Files Flagged for Review:** $($results.Count)

---

## Scoring System

- **VERY HIGH (90-100%)**: Almost certainly dead code - safe to delete
- **HIGH (70-89%)**: Very likely dead code - review and delete
- **MEDIUM (50-69%)**: Possibly dead code - needs investigation
- **LOW-MEDIUM (30-49%)**: Unlikely but possible dead code - minimal risk
- **LOW (0-29%)**: Likely active code - do not delete

---

## Key Indicators

- ✅ **IS IMPORTED**: File is actively imported (reduces deletion score)
- ✅ **IS IN ROUTES**: File is referenced in Router.tsx (reduces deletion score)
- ❌ **Not Imported**: File is not imported anywhere (increases deletion score)
- 📁 **misc-legacy**: Files in misc-legacy directory (high deletion probability)
- 🔧 **.broken/.clean**: Files with broken/clean extensions (very high deletion probability)

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
    $importStatus = if ($item.IsImported) { "✅ IMPORTED" } else { "❌ NOT IMPORTED" }
    $routeStatus = if ($item.IsInRoutes) { "✅ IN ROUTES" } else { "❌ NOT IN ROUTES" }
    $report += "- **$($item.File)** (Score: $($item.Score))`n"
    $report += "  - Status: $importStatus | $routeStatus`n"
    $report += "  - Reasons: $($item.Reasons)`n"
}

$report += "`n### HIGH Certainty (70-89%) - $($high.Count) files`n`n"
$report += "These files are very likely dead code. Review and delete if confirmed unused.`n`n"
foreach ($item in $high) {
    $importStatus = if ($item.IsImported) { "✅ IMPORTED" } else { "❌ NOT IMPORTED" }
    $routeStatus = if ($item.IsInRoutes) { "✅ IN ROUTES" } else { "❌ NOT IN ROUTES" }
    $report += "- **$($item.File)** (Score: $($item.Score))`n"
    $report += "  - Status: $importStatus | $routeStatus`n"
    $report += "  - Reasons: $($item.Reasons)`n"
}

$report += "`n### MEDIUM Certainty (50-69%) - $($medium.Count) files`n`n"
$report += "These files may be dead code. Investigate before deleting.`n`n"
foreach ($item in $medium | Select-Object -First 50) {
    $importStatus = if ($item.IsImported) { "✅ IMPORTED" } else { "❌ NOT IMPORTED" }
    $routeStatus = if ($item.IsInRoutes) { "✅ IN ROUTES" } else { "❌ NOT IN ROUTES" }
    $report += "- **$($item.File)** (Score: $($item.Score))`n"
    $report += "  - Status: $importStatus | $routeStatus`n"
    $report += "  - Reasons: $($item.Reasons)`n"
}
if ($medium.Count -gt 50) {
    $report += "`n*... and $($medium.Count - 50) more files in this category*`n"
}

$report += "`n### LOW-MEDIUM Certainty (30-49%) - $($lowMedium.Count) files`n`n"
$report += "These files are unlikely to be dead code but have some indicators. Review carefully.`n`n"
foreach ($item in $lowMedium | Select-Object -First 30) {
    $importStatus = if ($item.IsImported) { "✅ IMPORTED" } else { "❌ NOT IMPORTED" }
    $routeStatus = if ($item.IsInRoutes) { "✅ IN ROUTES" } else { "❌ NOT IN ROUTES" }
    $report += "- **$($item.File)** (Score: $($item.Score))`n"
    $report += "  - Status: $importStatus | $routeStatus`n"
    $report += "  - Reasons: $($item.Reasons)`n"
}
if ($lowMedium.Count -gt 30) {
    $report += "`n*... and $($lowMedium.Count - 30) more files in this category*`n"
}

$report += "`n---`n`n## Summary Statistics`n`n"
$report += "- **Very High Certainty:** $($veryHigh.Count) files`n"
$report += "- **High Certainty:** $($high.Count) files`n"
$report += "- **Medium Certainty:** $($medium.Count) files`n"
$report += "- **Low-Medium Certainty:** $($lowMedium.Count) files`n"
$report += "- **Total Flagged:** $($results.Count) files`n"

$report += "`n---`n`n## Recommendations`n`n"
$report += "1. **Start with VERY HIGH certainty files** - These can be safely deleted immediately.`n"
$report += "2. **Review HIGH certainty files** - Check if they're truly unused before deleting.`n"
$report += "3. **Investigate MEDIUM certainty files** - These may have edge cases or be used dynamically.`n"
$report += "4. **Be cautious with LOW-MEDIUM files** - These are likely still in use.`n"

$report | Out-File -FilePath "dead-code-analysis-enhanced.md" -Encoding utf8

Write-Host "`nAnalysis complete! Report saved to dead-code-analysis-enhanced.md"
Write-Host "Very High: $($veryHigh.Count), High: $($high.Count), Medium: $($medium.Count), Low-Medium: $($lowMedium.Count)"

