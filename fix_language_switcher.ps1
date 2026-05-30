$ErrorActionPreference = 'Stop'
$root = (Resolve-Path $PSScriptRoot).Path
$sections = Get-Content (Join-Path $root 'language-sections.json') -Raw -Encoding UTF8 | ConvertFrom-Json

$LangHomes = @{
    en = 'index.html'; fr = 'fr/index.html'; de = 'de/index.html'
    it = 'it/index.html'; es = 'es/index.html'; ru = 'ru/index.html'
    pl = 'pl/index.html'; pt = 'pt/index.html'; zh = 'zh/index.html'
}
$HreflangToLang = @{
    'en-US'='en'; en='en'; 'fr-FR'='fr'; fr='fr'; 'de-DE'='de'; de='de'
    'it-IT'='it'; it='it'; 'es-ES'='es'; es='es'; 'ru-RU'='ru'; ru='ru'
    'pl-PL'='pl'; pl='pl'; 'pt-PT'='pt'; pt='pt'; 'zh-CN'='zh'; zh='zh'
}
$LangOrder = @('en','fr','de','it','es','ru','pl','pt','zh')

function Normalize-Path([string]$p) { ($p -replace '\\','/').TrimStart('./') }

function Test-PageExists([string]$rel) {
    $rel = Normalize-Path $rel
    $full = Join-Path $root ($rel -replace '/',[IO.Path]::DirectorySeparatorChar)
    if (Test-Path $full -PathType Leaf) { return $true }
    if ($rel -match '^(.*)/index\.html$') {
        $alt = "$($Matches[1]).html"
        $af = Join-Path $root ($alt -replace '/',[IO.Path]::DirectorySeparatorChar)
        return Test-Path $af -PathType Leaf
    }
    return $false
}

function Resolve-BestPath([string]$rel) {
    $rel = Normalize-Path $rel
    $full = Join-Path $root ($rel -replace '/',[IO.Path]::DirectorySeparatorChar)
    if (Test-Path $full -PathType Leaf) { return $rel }
    if ($rel -match '^(.*)/index\.html$') {
        $alt = "$($Matches[1]).html"
        $af = Join-Path $root ($alt -replace '/',[IO.Path]::DirectorySeparatorChar)
        if (Test-Path $af -PathType Leaf) { return ($alt -replace '\\','/') }
    }
    return $rel
}

function Get-CurrentLang([string]$relPath) {
    $first = ((Normalize-Path $relPath) -split '/')[0]
    if ($LangHomes.ContainsKey($first)) { return $first }
    return 'en'
}

function Get-RelativeHref([string]$fromFile, [string]$targetRel) {
    $fromDir = [IO.Path]::GetDirectoryName($fromFile)
    $targetFull = [IO.Path]::Combine($root, ($targetRel -replace '/',[IO.Path]::DirectorySeparatorChar))
    $fromUri = New-Object System.Uri ($(if ($fromDir.EndsWith('\')) { $fromDir } else { "$fromDir\" }))
    $toUri = New-Object System.Uri $targetFull
    return $fromUri.MakeRelativeUri($toUri).ToString()
}

function Parse-HreflangMap([string]$html) {
    $map = @{}
    $rx = [regex]'<link\s+rel="alternate"\s+hreflang="([^"]+)"\s+href="([^"]+)"\s*/?>'
    foreach ($m in $rx.Matches($html)) {
        $hl = $m.Groups[1].Value
        if (-not $HreflangToLang.ContainsKey($hl)) { continue }
        $lang = $HreflangToLang[$hl]
        if (-not $map.ContainsKey($lang)) { $map[$lang] = $m.Groups[2].Value }
    }
    return $map
}

function Test-HreflangMapValid($map) {
    if ($map.Count -lt 4) { return $false }
    if (($map.Values | Select-Object -Unique).Count -lt 4) { return $false }
    $idx = ($map.Values | Where-Object { $_ -match '(^|/)index\.html$' }).Count
  return -not ($idx -ge ($map.Count - 1))
}

function Get-PaginationTranslationMap([string]$relPath) {
    $rel = Normalize-Path $relPath
    foreach ($secKey in $sections.PSObject.Properties.Name) {
        $sec = $sections.$secKey
        foreach ($lang in $LangOrder) {
            $cfg = $sec.$lang
            $pat = '^' + [regex]::Escape($cfg.b) + '/' + [regex]::Escape($cfg.p) + '/([^/]+\.html)$'
            if ($rel -match $pat) {
                $pageFile = $Matches[1]
                $result = @{}
                foreach ($l2 in $LangOrder) {
                    $c2 = $sec.$l2
                    $cands = @($pageFile)
                    if ($pageFile -match '^(\d+)-2\.html$') { $cands += ($pageFile -replace '-2','') }
                    if ($pageFile -match '^(\d+)\.html$') { $cands += ($pageFile -replace '\.html$','-2.html') }
                    $found = $false
                    foreach ($pf in $cands) {
                        $p = "$($c2.b)/$($c2.p)/$pf"
                        if (Test-PageExists $p) {
                            $result[$l2] = Resolve-BestPath $p
                            $found = $true
                            break
                        }
                    }
                    if (-not $found) { $result[$l2] = Resolve-BestPath $LangHomes[$l2] }
                }
                return $result
            }
        }
    }
    return $null
}

function Build-TranslationMap([string]$fileFullPath, [string]$html) {
    $parsed = Parse-HreflangMap $html
    if (Test-HreflangMapValid $parsed) {
        $out = @{}
        foreach ($k in $parsed.Keys) { $out[$k] = Resolve-BestPath $parsed[$k] }
        return $out
    }
    $pag = Get-PaginationTranslationMap (Normalize-Path $fileFullPath.Substring($root.Length).TrimStart('\','/'))
    if ($pag) { return $pag }
    $fb = @{}
    foreach ($l in $LangOrder) { $fb[$l] = $LangHomes[$l] }
    return $fb
}

function Fix-SwitcherLinks([string]$html, $transMap, [string]$fromFile) {
    $rxA = [regex]'<a\s+href="[^"]*"(\s+data-label="right"\s+aria-label="[^"]*"\s+lang="([a-z]{2}(?:-[A-Z]{2})?)")'
    return $rxA.Replace($html, {
        param($m)
        $hl = $m.Groups[2].Value
        $lc = if ($HreflangToLang.ContainsKey($hl)) { $HreflangToLang[$hl] } else { $hl.Split('-')[0].ToLower() }
        if ($transMap.ContainsKey($lc)) {
            $href = Get-RelativeHref $fromFile $transMap[$lc]
            return '<a href="' + $href + '"' + $m.Groups[1].Value
        }
        return $m.Value
    })
}

function Fix-HreflangBlock([string]$html, $transMap, [string]$fromFile) {
    if ($html -notmatch 'rel="alternate"\s+hreflang=') { return $html }
    $html = [regex]::Replace($html, '<link\s+rel="alternate"\s+hreflang="[^"]+"\s+href="[^"]+"\s*/>\s*', '')
    $tags = ''
    foreach ($hl in @('en-US','fr-FR','de-DE','it-IT','es-ES','ru-RU','pl-PL','pt-PT','zh-CN','en','fr','de','it','es','ru','pl','pt','zh')) {
        if (-not $HreflangToLang.ContainsKey($hl)) { continue }
        $lc = $HreflangToLang[$hl]
        if (-not $transMap.ContainsKey($lc)) { continue }
        $href = Get-RelativeHref $fromFile $transMap[$lc]
        $tags += '<link rel="alternate" hreflang="' + $hl + '" href="' + $href + '"/>' + "`n"
    }
    return [regex]::Replace($html, '(<link rel="https://api\.w\.org/")', ($tags + '$1'), 1)
}

$stats = @{ Updated=0; Switcher=0; Hreflang=0; Trp=0; Script=0 }

$files = Get-ChildItem $root -Recurse -Filter '*.html' -File |
    Where-Object { $_.FullName -notmatch '\\wp-content\\uploads\\' }

foreach ($file in $files) {
    $c = Get-Content $file.FullName -Raw -Encoding UTF8
    if ($c -notmatch 'ct-language-switcher') { continue }

    $orig = $c
    $tm = Build-TranslationMap $file.FullName $c

    $c2 = Fix-SwitcherLinks $c $tm $file.FullName
    if ($c2 -ne $c) { $stats.Switcher++; $c = $c2 }

    $c3 = Fix-HreflangBlock $c $tm $file.FullName
    if ($c3 -ne $c) { $stats.Hreflang++; $c = $c3 }

    $c4 = [regex]::Replace($c, '<script[^>]*trp-language-switcher[^>]*>\s*</script>\s*', '')
    $c4 = [regex]::Replace($c4, '<script[^>]*id="trp-language-switcher[^>]*>\s*</script>\s*', '')
    if ($c4 -ne $c) { $stats.Trp++; $c = $c4 }

    if ($c -notmatch 'local-lang-switcher\.js') {
        $sh = Get-RelativeHref $file.FullName 'assets/local-lang-switcher.js'
        $hj = ($LangHomes.GetEnumerator() | ForEach-Object { '"' + $_.Key + '":"' + $_.Value + '"' }) -join ','
        $inj = "<script>window.NPACKPM_LANG_HOMES={$hj};</script>`n<script src=`"$sh`"></script>`n"
        $c = [regex]::Replace($c, '</body>', ($inj + '</body>'), 1)
        $stats.Script++
    }

    if ($c -ne $orig) {
        [IO.File]::WriteAllText($file.FullName, $c, [Text.UTF8Encoding]::new($false))
        $stats.Updated++
    }
}

$report = @"
Language Switcher Fix Report
============================
Files updated: $($stats.Updated)
Switcher links fixed: $($stats.Switcher)
Hreflang blocks fixed: $($stats.Hreflang)
TRP scripts removed: $($stats.Trp)
Local JS injected: $($stats.Script)

Language homes:
$(foreach ($l in $LangOrder) { "  $($l.ToUpper()) -> $($LangHomes[$l])" })
"@
$report | Out-File (Join-Path $root 'fix_language_switcher_report.txt') -Encoding utf8
Write-Host $report
