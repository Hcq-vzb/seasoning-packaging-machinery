$ErrorActionPreference = 'Stop'
$root = (Resolve-Path $PSScriptRoot).Path

# Localized Services page filename per language folder
$langServices = @{
    'de' = 'dienstleistungen.html'
    'es' = 'servicios.html'
    'fr' = 'services.html'
    'it' = 'servizi.html'
    'pl' = 'uslugi.html'
    'pt' = 'servicos.html'
    'ru' = ([System.IO.Directory]::GetFiles((Join-Path $root 'ru'), '*.*.html') | Where-Object { $_ -match 'услуг' -or $_ -match '%d1%83' } | Select-Object -First 1 | Split-Path -Leaf)
    'zh' = ([System.IO.Directory]::GetFiles((Join-Path $root 'zh'), '*.html') | Where-Object { $_ -match '服务' } | Select-Object -First 1 | Split-Path -Leaf)
}
# Fallback encoded names if glob fails
if (-not $langServices['ru']) { $langServices['ru'] = '%d1%83%d1%81%d0%bb%d1%83%d0%b3%d0%b8.html' }
if (-not $langServices['zh']) { $langServices['zh'] = '%e6%9c%8d%e5%8a%a1.html' }

function Get-ServicesTargetRelative([string]$fileFullPath) {
    $rel = $fileFullPath.Substring($root.Length).TrimStart('\', '/')
    $parts = $rel -split '[\\/]'
    $lang = $null
    if ($parts.Count -gt 0 -and $langServices.ContainsKey($parts[0])) {
        $lang = $parts[0]
        $target = "$lang/$($langServices[$lang])"
    } else {
        $target = 'services.html'
    }
    return $target.Replace('\', '/')
}

function Get-RelativeHref([string]$fromFile, [string]$targetRel) {
    $fromDir = [System.IO.Path]::GetDirectoryName($fromFile)
    $targetFull = [System.IO.Path]::Combine($root, ($targetRel -replace '/', [IO.Path]::DirectorySeparatorChar))
    $fromUri = New-Object System.Uri ($(if ($fromDir.EndsWith('\')) { $fromDir } else { "$fromDir\" }))
    $toUri = New-Object System.Uri $targetFull
    return $fromUri.MakeRelativeUri($toUri).ToString()
}

$menuFixed = 0
$globalFixed = 0
$stubRemoved = 0

# Remove services/ stub directories (redirect only; real page is services.html)
foreach ($stub in @('services', 'fr\services')) {
    $dir = Join-Path $root $stub
    if (Test-Path $dir -PathType Container) {
        $idx = Join-Path $dir 'index.html'
        if (Test-Path $idx) {
            $c = Get-Content $idx -Raw
            if ($c -match 'Page has moved|HTTrack') {
                Remove-Item $dir -Recurse -Force
                $stubRemoved++
            }
        }
    }
}

$files = Get-ChildItem -Path $root -Recurse -Include '*.html' -File |
    Where-Object { $_.FullName -notmatch '\\wp-content\\|\\wp-includes\\' }

foreach ($file in $files) {
    $text = [System.IO.File]::ReadAllText($file.FullName)
    $orig = $text

    # Fix menu-item-1956 Services nav link (desktop + mobile menus)
    $targetRel = Get-ServicesTargetRelative $file.FullName
    $correctHref = Get-RelativeHref $file.FullName $targetRel
    $text = [regex]::Replace($text,
        '(menu-item-1956[^>]*>\s*<a\s+href=")[^"]+(")',
        { param($m) $m.Groups[1].Value + $correctHref + $m.Groups[2].Value })

    # Global: services/index.html -> services.html (and fr/services/)
    $beforeGlobal = $text
    $text = $text.Replace('services/index.html', 'services.html')
    $text = $text.Replace('fr/services/index.html', 'fr/services.html')
    $text = $text.Replace('de/dienstleistungen/index.html', 'de/dienstleistungen.html')
    if ($text -ne $beforeGlobal) { $globalFixed++ }

    if ($text -ne $orig) {
        if ($text -match 'menu-item-1956') { $menuFixed++ }
        [System.IO.File]::WriteAllText($file.FullName, $text, [System.Text.UTF8Encoding]::new($false))
    }
}

# Verify pagination pages
$samplePaths = @(
    'product\page\2.html',
    'news\page\2.html',
    'fr\produit\page\2.html',
    'de\nachrichten\seite\2.html',
    'zh\新闻\页码\2-2.html'
)
Write-Host "=== Services Fix Report ==="
Write-Host "Stub directories removed: $stubRemoved"
Write-Host "Files with menu Services link updated: $menuFixed"
Write-Host "Files with services/index.html fixed: $globalFixed"
Write-Host ""
Write-Host "Services pages found:"
Write-Host "  $root\services.html"
Write-Host "  $root\fr\services.html"
foreach ($l in $langServices.Keys) {
    $p = Join-Path $root "$l\$($langServices[$l])"
    if (Test-Path $p) { Write-Host "  $p" }
}
Write-Host ""
Write-Host "Sample nav hrefs after fix:"
foreach ($sp in $samplePaths) {
    $fp = Join-Path $root $sp
    if (Test-Path $fp) {
        $m = Select-String -Path $fp -Pattern 'menu-item-1956.*?href="([^"]+)"' | Select-Object -First 1
        if ($m) { Write-Host "  $sp -> $($m.Matches[0].Groups[1].Value)" }
    }
}

# Count remaining bad patterns
$badMenu = 0
foreach ($f in $files) {
    $c = Get-Content $f.FullName -Raw
    if ($c -match 'menu-item-1956[^>]+href="services\.html"' -and $f.FullName -match '\\page\\|\\seite\\|\\pagina\\|\\strona\\|\\页码\\|\\страница\\') {
        $badMenu++
    }
}
Write-Host ""
Write-Host "Pagination files still using bare services.html: $badMenu"
