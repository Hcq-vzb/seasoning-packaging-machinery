# Repair corrupted links from failed bulk replace
$ErrorActionPreference = "Stop"
$Root = $PSScriptRoot

function Get-LangPrefix([string]$relPath) {
    $parts = $relPath -split '/'
    if ($parts.Count -gt 1 -and $parts[0] -in @('zh','pl','pt','ru','es','it','de','fr')) {
        return $parts[0]
    }
    return ''
}

function Get-DepthPrefix([string]$filePath) {
    $rel = $filePath.Substring($Root.Length).TrimStart('\').Replace('\','/')
    $dir = Split-Path $rel -Parent
    if (-not $dir) { return '' }
    $depth = ($dir -split '/').Count
    if ($depth -le 0) { return '' }
    return ('../' * $depth)
}

function Normalize-UrlPath([string]$path) {
    if ([string]::IsNullOrEmpty($path)) { return "/" }
    $path = [uri]::UnescapeDataString(($path -split '\?')[0].Split('#')[0])
    if (-not $path.StartsWith("/")) { $path = "/" + $path }
    $path = $path.TrimEnd("/")
    if ($path -eq "") { return "/" }
    return $path.ToLowerInvariant()
}

Write-Host "Building URL index..."
$UrlIndex = @{}
$MirroredRe = [regex]'<!--\s*Mirrored from\s+(?:https?://)?(?:www\.)?npackpm\.com(?<path>[^?\s]*)(?:\?[^\s]*)?\s+by HTTrack'

$htmlFiles = @()
Get-ChildItem -Path $Root -Recurse -File | Where-Object {
    $_.Extension -match '^\.html?$' -and $_.Name -notmatch '^fix_'
} | ForEach-Object { $htmlFiles += $_ }

foreach ($f in $htmlFiles) {
    $fp = $f.FullName
    $text = [IO.File]::ReadAllText($fp)
    foreach ($m in $MirroredRe.Matches($text)) {
        $norm = Normalize-UrlPath $m.Groups['path'].Value
        if (-not $UrlIndex.ContainsKey($norm)) { $UrlIndex[$norm] = $fp }
    }
    $rel = $f.FullName.Substring($Root.Length).TrimStart('\').Replace('\','/')
    if ($f.Name -ieq 'index.html') {
        $urlPath = '/' + ($rel -replace '/index\.html$','')
    } else {
        $urlPath = '/' + ($rel -replace '\.html?$','')
    }
    $norm2 = Normalize-UrlPath $urlPath
    if (-not $UrlIndex.ContainsKey($norm2)) { $UrlIndex[$norm2] = $fp }
}
Write-Host "  $($UrlIndex.Count) URL paths indexed"

function Resolve-Local([string]$url) {
    if ($url -notmatch '^https?://') { return $null }
    $uri = [uri]$url
    if ($uri.Host.ToLowerInvariant() -notin @('www.npackpm.com','npackpm.com')) { return $null }
    $path = Normalize-UrlPath $uri.AbsolutePath
    if ($UrlIndex.ContainsKey($path)) { return $UrlIndex[$path] }
    if ($UrlIndex.ContainsKey($path + '.html')) { return $UrlIndex[$path + '.html'] }
    return $null
}

function To-Relative([string]$target, [string]$source) {
    $tUri = New-Object Uri($target)
    $sUri = New-Object Uri($source)
    return [uri]::UnescapeDataString($sUri.MakeRelativeUri($tUri).ToString()) -replace '\\','/'
}

# Build menu-item-id -> href map per language from best reference pages
$MenuMaps = @{}
$refCandidates = @{
    '' = @('index.html')
    'zh' = @('zh\主轴旋盖机.html','zh\index.html')
    'pl' = @('pl\index.html')
    'pt' = @('pt\index.html')
    'ru' = @('ru\index.html')
    'es' = @('es\index.html')
    'it' = @('it\index.html')
    'de' = @('de\index.html')
    'fr' = @('fr\index.html')
}
$menuItemRe = [regex]'menu-item-(?<id>\d+)[^>]*>\s*<a\s+href="(?<href>(?!.*2024-our-chinese)[^"]+)"'

foreach ($lang in $refCandidates.Keys) {
    $map = @{}
    foreach ($rel in $refCandidates[$lang]) {
        $p = Join-Path $Root ($rel -replace '/','\')
        if (-not (Test-Path $p)) { continue }
        $t = [IO.File]::ReadAllText($p)
        foreach ($m in $menuItemRe.Matches($t)) {
            $id = $m.Groups['id'].Value
            if (-not $map.ContainsKey($id)) { $map[$id] = $m.Groups['href'].Value }
        }
    }
    $MenuMaps[$lang] = $map
    Write-Host "  Menu map [$lang]: $($map.Count) items"
}

$BrokenRe = [regex]'(\.\./)*2024-our-chinese-new-year-holiday\.html/index\.html'
$stats = @{ files=0; menu=0; srcset=0; generic=0 }

foreach ($f in $htmlFiles) {
    $fp = $f.FullName
    $orig = [IO.File]::ReadAllText($fp)
    $text = $orig
    $rel = $fp.Substring($Root.Length).TrimStart('\').Replace('\','/')
    $lang = Get-LangPrefix $rel
    $depthPrefix = Get-DepthPrefix $fp

    # Fix menu links by menu-item-id
    if ($MenuMaps.ContainsKey($lang) -and $MenuMaps[$lang].Count -gt 0) {
        $text = [regex]::Replace($text, '(?s)(<li[^>]*menu-item-(?<id>\d+)[^>]*>\s*<a\s+)href="(?:\.\./)*2024-our-chinese-new-year-holiday\.html/index\.html"', {
            param($m)
            $id = $m.Groups['id'].Value
            if ($MenuMaps[$lang].ContainsKey($id)) {
                $href = $MenuMaps[$lang][$id]
                if ($href -notmatch '^(\.\./|https?://|/)' -and $lang -ne '') {
                    $href = $depthPrefix + $href
                } elseif ($href -notmatch '^(\.\./|https?://|/)' -and $lang -eq '') {
                    # root english - href stays as filename
                }
                $script:stats.menu++
                return ($m.Groups[1].Value + 'href="' + $href + '"')
            }
            return $m.Value
        })
    }

    # Fix srcset: use src when srcset is broken
    $text = [regex]::Replace($text, '(<img\b[^>]*\bsrc="(?<src>(?!.*2024-our-chinese)[^"]+)"[^>]*\bsrcset=")(?:\.\./)*2024-our-chinese-new-year-holiday\.html/index\.html[^"]*"', {
        param($m)
        $script:stats.srcset++
        return ($m.Groups[1].Value + $m.Groups['src'].Value + '"')
    })

    # Search form action -> language home
    $homeHref = if ($lang) { $depthPrefix + 'index.html' } else { 'index.html' }
    $text = [regex]::Replace($text, '(class="ct-search-form"[^>]*\saction=")(?:\.\./)*2024-our-chinese-new-year-holiday\.html/index\.html"', "`${1}$homeHref`"")

    # JSON/ajax URLs -> language wp-json or index
    $ajaxUrl = if ($lang) { $depthPrefix + '../wp-json/' } else { 'wp-json/' }
    $text = $text -replace '(trp_custom_ajax_url|trp_wp_ajax_url|resturl)"\s*:\s*"(?:\.\./)*2024-our-chinese-new-year-holiday\.html/index\.html"', "`$1`":`"$ajaxUrl`""

    # msapplication / meta content
    $logoPath = if ($lang) { $depthPrefix + '../wp-content/uploads/2025/10/npack.png.webp' } else { 'wp-content/uploads/2025/10/npack.png.webp' }
    $text = $text -replace 'content="(?:\.\./)*2024-our-chinese-new-year-holiday\.html/index\.html"', "content=`"$logoPath`""

    # Canonical/prev/next - use Mirrored path
    $mir = $MirroredRe.Match($text)
    if ($mir.Success) {
        $pagePath = $mir.Groups['path'].Value
        if ($UrlIndex.ContainsKey((Normalize-UrlPath $pagePath))) {
            $local = $UrlIndex[(Normalize-UrlPath $pagePath)]
            $selfHref = To-Relative $local $fp
            $text = [regex]::Replace($text, '<link rel="canonical" href="(?:\.\./)*2024-our-chinese-new-year-holiday\.html/index\.html"\s*/>', "<link rel=`"canonical`" href=`"$selfHref`" />")
        }
    }

    # Remaining broken paths in href/src (non-menu): try URL index from Mirrored slug patterns
    $text = [regex]::Replace($text, '(href|src|action|content)="(?:\.\./)*2024-our-chinese-new-year-holiday\.html/index\.html"', {
        param($m)
        $script:stats.generic++
        $attr = $m.Groups[1].Value
        if ($attr -eq 'content') { return "$attr=`"$logoPath`"" }
        return "$attr=`"$homeHref`""
    })

    if ($text -ne $orig) {
        [IO.File]::WriteAllText($fp, $text)
        $stats.files++
    }
}

Write-Host ""
Write-Host "Repair done."
Write-Host "  Files modified: $($stats.files)"
Write-Host "  Menu links fixed: $($stats.menu)"
Write-Host "  Srcset fixed: $($stats.srcset)"
Write-Host "  Generic fixes: $($stats.generic)"
