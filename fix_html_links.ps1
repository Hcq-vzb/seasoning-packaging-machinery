$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot
$totalReplacements = 0
$filesChanged = 0

$patterns = @(
    '.html/index.html',
    '-html/index.html',
    '.html/"',
    ".html/'",
    '-html/"',
    "-html/'"
)

$files = Get-ChildItem -Path $root -Recurse -Include '*.html','*.js' -File |
    Where-Object { $_.FullName -notmatch '\\wp-content\\|\\wp-includes\\' }

foreach ($file in $files) {
    $bytes = [System.IO.File]::ReadAllBytes($file.FullName)
    $text = [System.Text.Encoding]::UTF8.GetString($bytes)
    $hasMatch = $false
    foreach ($p in $patterns) {
        if ($text.Contains($p)) { $hasMatch = $true; break }
    }
    if (-not $hasMatch) { continue }

    $before = $text
    $countBefore = ([regex]::Matches($text, '\.html/index\.html|-html/index\.html|\.html/["'']|-html/["'']')).Count

    $text = $text.Replace('.html/index.html', '.html')
    $text = $text.Replace('-html/index.html', '-html.html')
    $text = $text.Replace('.html/"', '.html"')
    $text = $text.Replace(".html/'", ".html'")
    $text = $text.Replace('-html/"', '-html.html"')
    $text = $text.Replace("-html/'", "-html.html'")

    if ($text -ne $before) {
        [System.IO.File]::WriteAllText($file.FullName, $text, [System.Text.UTF8Encoding]::new($false))
        $filesChanged++
        $totalReplacements += $countBefore
    }
}

# Remove backup txt files
Get-ChildItem -Path $root -Filter '*.html.txt' -File | Remove-Item -Force

$remaining = 0
foreach ($file in $files) {
    $line = Select-String -Path $file.FullName -Pattern '\.html/index\.html|-html/index\.html' -Quiet -ErrorAction SilentlyContinue
    if ($line) { $remaining++ }
}

Write-Host "Files changed: $filesChanged"
Write-Host "Approx link fixes: $totalReplacements"
Write-Host "Files still with bad patterns: $remaining"
