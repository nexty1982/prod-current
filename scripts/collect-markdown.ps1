param(
  [string]$SourceRoot = "Z:\prod",
  [string]$DestinationRoot = "Z:\prod\_md_collected",
  [switch]$Flat
)

# Ensure destination exists
New-Item -ItemType Directory -Path $DestinationRoot -Force | Out-Null

Write-Host "Collecting .md files from: $SourceRoot" -ForegroundColor Cyan
Write-Host "Destination: $DestinationRoot" -ForegroundColor Cyan

# Exclude the destination folder from scan
$exclude = [IO.Path]::GetFullPath($DestinationRoot)

$sw = [System.Diagnostics.Stopwatch]::StartNew()
$found = 0
$copied = 0

Get-ChildItem -Path $SourceRoot -Recurse -File -Filter *.md | Where-Object {
  $full = [IO.Path]::GetFullPath($_.FullName)
  # Do not traverse/copy from the destination itself
  -not $full.StartsWith($exclude, [System.StringComparison]::OrdinalIgnoreCase)
} | ForEach-Object {
  $found++
  if ($Flat) {
    # Flatten into destination; prefix duplicates with an index
    $baseName = $_.Name
    $destPath = Join-Path $DestinationRoot $baseName
    if (Test-Path $destPath) {
      $i = 1
      $nameNoExt = [IO.Path]::GetFileNameWithoutExtension($baseName)
      $ext = [IO.Path]::GetExtension($baseName)
      do {
        $destPath = Join-Path $DestinationRoot ("{0}__{1}{2}" -f $nameNoExt, $i, $ext)
        $i++
      } while (Test-Path $destPath)
    }
    Copy-Item -Path $_.FullName -Destination $destPath -Force
    $copied++
  } else {
    # Preserve relative directory structure
    $rel = $_.FullName.Substring($SourceRoot.Length).TrimStart('\\')
    $destPath = Join-Path $DestinationRoot $rel
    $destDir = Split-Path $destPath -Parent
    if (-not (Test-Path $destDir)) { New-Item -ItemType Directory -Path $destDir -Force | Out-Null }
    Copy-Item -Path $_.FullName -Destination $destPath -Force
    $copied++
  }
}

$sw.Stop()

Write-Host ("Found: {0} .md files" -f $found) -ForegroundColor Green
Write-Host ("Copied: {0} files in {1:N1}s" -f $copied, $sw.Elapsed.TotalSeconds) -ForegroundColor Green

# Basic verification
$destCount = (Get-ChildItem -Path $DestinationRoot -Recurse -File -Filter *.md | Measure-Object).Count
Write-Host ("Destination currently contains: {0} .md files" -f $destCount) -ForegroundColor Yellow

if ($destCount -lt $copied) {
  Write-Warning "Destination .md count less than copied count — there may be access or path issues."
}
