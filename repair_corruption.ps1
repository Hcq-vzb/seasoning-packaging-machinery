# Remove PowerShell corruption injected into HTML and restore asset URLs
$ErrorActionPreference = "Stop"
$Root = $PSScriptRoot

function Get-AssetPrefix([string]$filePath) {
    $rel = $filePath.Substring($Root.Length).TrimStart('\').Replace('\','/')
    $dir = Split-Path $rel -Parent
    if (-not $dir) { return '' }
    $depth = ($dir -split '/').Count
    return ('../' * ($depth + 1))
}

function Extract-Assets([string]$htmlPath) {
    $map = @{}
    $text = [IO.File]::ReadAllText($htmlPath)
    $re = [regex]"<link\b[^>]*\bid=['""](?<id>[^'""]+)['""][^>]*\bhref=['""](?<href>[^'""]+)['""]"
    foreach ($m in $re.Matches($text)) {
        $href = $m.Groups['href'].Value
        if ($href -notmatch 'script:stats' -and $href -match 'wp-content|wp-includes') { $map[$m.Groups['id'].Value] = $href }
    }
    $re2 = [regex]"<script\b[^>]*\bid=['""](?<id>[^'""]+)['""][^>]*\bsrc=['""](?<src>[^'""]+)['""]"
    foreach ($m in $re2.Matches($text)) {
        $src = $m.Groups['src'].Value
        if ($src -notmatch 'script:stats' -and $src -match 'wp-content|wp-includes') { $map[$m.Groups['id'].Value] = $src }
    }
    return $map
}

$enAssets = Extract-Assets (Join-Path $Root 'index.html')
$zhAssets = Extract-Assets (Join-Path $Root 'zh\index.html')

$corruptBlock = '(?s)\s*\$script:stats\.generic\+\+\s*return \(\$assetPrefix \+ ''wp-content/uploads/2025/10/npack\.png\.webp''\)\s*'

$htmlFiles = @()
Get-ChildItem -Path $Root -Recurse -File | Where-Object {
    $_.Extension -match '^\.html?$' -and $_.Name -notmatch '^(fix_|repair_)'
} | ForEach-Object { $htmlFiles += $_ }

$stats = @{ files=0; fixed=0 }
foreach ($f in $htmlFiles) {
    $fp = $f.FullName
    $orig = [IO.File]::ReadAllText($fp)
    if ($orig -notmatch '\$script:stats') { continue }
    $text = $orig
    $rel = $fp.Substring($Root.Length).TrimStart('\').Replace('\','/')
    $isZh = $rel -like 'zh/*' -or $rel -eq 'zh.html'
    $assets = if ($isZh) { $zhAssets } else { $enAssets }
    $assetPrefix = Get-AssetPrefix $fp

    # Fix corrupted link/script tags with id
    $text = [regex]::Replace($text, "(?s)(<link\b[^>]*\bid=['""](?<id>[^'""]+)['""][^>]*\bhref=['""])$corruptBlock(\?[^'""]*)?['""]", {
        param($m)
        $id = $m.Groups['id'].Value
        $qs = $m.Groups[2].Value
        if ($assets.ContainsKey($id)) {
            $href = $assets[$id]
            if ($href -match '^\.\./') { $href = $assetPrefix + ($href -replace '^\.\./','') }
            elseif ($href -notmatch '^https?://') { $href = $assetPrefix + $href }
            $script:stats.fixed++
            return ($m.Groups[1].Value + $href + $qs + "'")
        }
        # fallback wp-block-library etc
        $fallback = $assetPrefix + 'wp-includes/css/dist/block-library/style.min.css'
        if ($id -eq 'wp-block-library-css') { $script:stats.fixed++; return ($m.Groups[1].Value + $fallback + ($qs -replace '^\?','?') + "'") }
        $script:stats.fixed++
        return ($m.Groups[1].Value + $assetPrefix + 'wp-content/uploads/2025/10/npack.png.webp' + "'")
    })

    $text = [regex]::Replace($text, "(?s)(<script\b[^>]*\bid=['""](?<id>[^'""]+)['""][^>]*\bsrc=['""])$corruptBlock(\?[^'""]*)?['""]", {
        param($m)
        $id = $m.Groups['id'].Value
        $qs = $m.Groups[2].Value
        if ($assets.ContainsKey($id)) {
            $src = $assets[$id]
            if ($src -match '^\.\./') { $src = $assetPrefix + ($src -replace '^\.\./','') }
            elseif ($src -notmatch '^https?://') { $src = $assetPrefix + $src }
            $script:stats.fixed++
            return ($m.Groups[1].Value + $src + $qs + "'")
        }
        $script:stats.fixed++
        return ($m.Groups[1].Value + $assetPrefix + 'wp-includes/js/jquery/jquery.min.js' + "'")
    })

    # Fix corrupted JSON string values
    $text = [regex]::Replace($text, "(?s)""$corruptBlock""", {
        $script:stats.fixed++
        return "`"$assetPrefix`wp-content/uploads/2025/10/npack.png.webp`""
    })

    # Remove any remaining corruption fragments
    $text = $text -replace $corruptBlock, ''

    if ($text -ne $orig) {
        [IO.File]::WriteAllText($fp, $text)
        $stats.files++
    }
}

Write-Host "Corruption repair done: $($stats.files) files, $($stats.fixed) tags fixed"
