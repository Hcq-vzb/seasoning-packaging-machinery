# Fix WinHTTrack .html folder structure and broken links
$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot
$report = @{
    EnglishFoldersFixed = 0
    DashHtmlFoldersRemoved = 0
    LinkReplacements = 0
    Errors = @()
}

function Test-RedirectStub {
    param([string]$IndexPath)
    if (-not (Test-Path $IndexPath)) { return $false }
    $content = Get-Content $IndexPath -Raw -ErrorAction SilentlyContinue
    if ($null -eq $content) { return $false }
    return ($content.Length -lt 3000) -and ($content -match 'HTTrack|Page has moved|META HTTP-EQUIV="Refresh"')
}

# --- Phase 1: Fix root English .html directories using .html.txt backups ---
$htmlDirs = Get-ChildItem -Path $root -Directory | Where-Object { $_.Name -match '\.html$' }
foreach ($dir in $htmlDirs) {
    try {
        $name = $dir.Name
        $targetFile = Join-Path $root $name
        $txtBackup = Join-Path $root ($name + '.txt')
        $indexPath = Join-Path $dir.FullName 'index.html'

        if (Test-Path $txtBackup) {
            Remove-Item -LiteralPath $dir.FullName -Recurse -Force
            Copy-Item -LiteralPath $txtBackup -Destination $targetFile -Force
            $report.EnglishFoldersFixed++
        }
        elseif (Test-Path $indexPath) {
            $idxSize = (Get-Item $indexPath).Length
            if ($idxSize -gt 5000) {
                Remove-Item -LiteralPath $dir.FullName -Recurse -Force
                Move-Item -LiteralPath $indexPath -Destination $targetFile -Force
                $report.EnglishFoldersFixed++
            }
            else {
                $report.Errors += "No backup for $name (index only $($idxSize) bytes)"
            }
        }
    }
    catch {
        $report.Errors += "English fix failed for $($dir.Name): $_"
    }
}

# --- Phase 2: Remove -html stub directories (content already in .html files) ---
$dashHtmlDirs = Get-ChildItem -Path $root -Recurse -Directory | Where-Object {
    $_.Name -match '-html$' -and (Test-Path (Join-Path $_.FullName 'index.html'))
}
foreach ($dir in $dashHtmlDirs) {
    try {
        $indexPath = Join-Path $dir.FullName 'index.html'
        if (-not (Test-RedirectStub $indexPath)) { continue }

        $targetFile = Join-Path $dir.Parent.FullName ($dir.Name + '.html')
        if (-not (Test-Path $targetFile)) {
            # Move index to target if no file exists
            Move-Item -LiteralPath $indexPath -Destination $targetFile -Force
            Remove-Item -LiteralPath $dir.FullName -Recurse -Force -ErrorAction SilentlyContinue
            $report.DashHtmlFoldersRemoved++
            continue
        }

        $targetSize = (Get-Item $targetFile).Length
        if ($targetSize -gt 5000) {
            Remove-Item -LiteralPath $dir.FullName -Recurse -Force
            $report.DashHtmlFoldersRemoved++
        }
    }
    catch {
        $report.Errors += "Dash-html remove failed for $($dir.FullName): $_"
    }
}

# --- Phase 3: Fix links in all HTML and JS files ---
$extensions = @('*.html', '*.js')
$files = Get-ChildItem -Path $root -Recurse -Include $extensions -File |
    Where-Object { $_.FullName -notmatch '\\wp-content\\' -and $_.FullName -notmatch '\\wp-includes\\' }

$replacements = @(
    # xxx.html/index.html -> xxx.html
    @{ Pattern = '([a-zA-Z0-9_\-./%]+)\.html/index\.html'; Replacement = '$1.html' }
    # xxx-html/index.html -> xxx-html.html
    @{ Pattern = '([a-zA-Z0-9_\-./%]+)-html/index\.html'; Replacement = '$1-html.html' }
    # href with trailing slash on .html folder paths (not followed by more path)
    @{ Pattern = '(href=["''])([^"'']+?)\.html/(["''])'; Replacement = '${1}${2}.html${3}' }
    @{ Pattern = '(href=["''])([^"'']+?)-html/(["''])'; Replacement = '${1}${2}-html.html${3}' }
    # action/src/data-href variants
    @{ Pattern = '(action=["''])([^"'']+?)\.html/(["''])'; Replacement = '${1}${2}.html${3}' }
    @{ Pattern = '(action=["''])([^"'']+?)-html/(["''])'; Replacement = '${1}${2}-html.html${3}' }
)

foreach ($file in $files) {
    try {
        $content = [System.IO.File]::ReadAllText($file.FullName)
        $original = $content
        foreach ($r in $replacements) {
            $content = [regex]::Replace($content, $r.Pattern, $r.Replacement)
        }
        if ($content -ne $original) {
            $diff = ([regex]::Matches($original, '\.html/index\.html|\.html/|[-]html/index\.html|[-]html/')).Count
            $report.LinkReplacements += $diff
            if ($diff -eq 0) { $report.LinkReplacements += 1 }
            [System.IO.File]::WriteAllText($file.FullName, $content, [System.Text.UTF8Encoding]::new($false))
        }
    }
    catch {
        $report.Errors += "Link fix failed for $($file.FullName): $_"
    }
}

# Cleanup .html.txt backup files after successful English fix
if ($report.EnglishFoldersFixed -gt 0) {
    Get-ChildItem -Path $root -Filter '*.html.txt' -File | Remove-Item -Force
}

# --- Verification ---
$remainingHtmlDirs = (Get-ChildItem -Path $root -Recurse -Directory | Where-Object { $_.Name -match '\.html$' }).Count
$remainingDashHtml = (Get-ChildItem -Path $root -Recurse -Directory | Where-Object {
    $_.Name -match '-html$' -and (Test-Path (Join-Path $_.FullName 'index.html'))
}).Count
$remainingBadLinks = 0
foreach ($f in (Get-ChildItem -Path $root -Recurse -Include '*.html','*.js' -File | Where-Object { $_.FullName -notmatch '\\wp-content\\' })) {
    $c = Get-Content $f.FullName -Raw -ErrorAction SilentlyContinue
    if ($c -match '\.html/index\.html|[-]html/index\.html') { $remainingBadLinks++ }
}

$report['RemainingHtmlDirs'] = $remainingHtmlDirs
$report['RemainingDashHtmlDirs'] = $remainingDashHtml
$report['RemainingFilesWithBadLinks'] = $remainingBadLinks

$reportPath = Join-Path $root 'fix_html_folder_report.json'
$report | ConvertTo-Json -Depth 5 | Set-Content $reportPath -Encoding UTF8

Write-Host "=== Fix Report ==="
Write-Host "English folders fixed: $($report.EnglishFoldersFixed)"
Write-Host "Dash-html stub folders removed: $($report.DashHtmlFoldersRemoved)"
Write-Host "Link replacement batches: $($report.LinkReplacements)"
Write-Host "Remaining .html dirs: $remainingHtmlDirs"
Write-Host "Remaining -html dirs with index: $remainingDashHtml"
Write-Host "Files still with bad link patterns: $remainingBadLinks"
if ($report.Errors.Count -gt 0) {
    Write-Host "Errors ($($report.Errors.Count)):"
    $report.Errors | ForEach-Object { Write-Host "  $_" }
}
Write-Host "Report saved to: $reportPath"
