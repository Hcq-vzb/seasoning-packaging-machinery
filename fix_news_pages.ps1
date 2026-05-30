# Comprehensive news pages fix: paths, images, pagination, hreflang, JS configs
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
$langFolders = @('fr','de','it','es','ru','pl','pt','zh')

$stats = @{
    FilesModified = 0
    EntryLinks = 0; EntryImages = 0
    MenuLinks = 0; HeadLinks = 0
    PaginationLinks = 0
    ImagesExternal = 0; DataSrcSync = 0
    Hreflang = 0; Switcher = 0
    JsSanitized = 0; CtLoc = 0; BaseRemoved = 0
    HtmlFolders = 0
}
$reportLines = [System.Collections.Generic.List[string]]::new()

function Normalize-Path([string]$p) { ($p -replace '\\','/').TrimStart('./') }

function Test-PageExists([string]$rel) {
    $rel = Normalize-Path $rel
    $full = Join-Path $root ($rel -replace '/',[IO.Path]::DirectorySeparatorChar)
    if (Test-Path $full -PathType Leaf) { return $true }
    if ($rel -match '^(.*)/index\.html$') {
        $alt = "$($Matches[1]).html"
        return Test-Path (Join-Path $root ($alt -replace '/',[IO.Path]::DirectorySeparatorChar)) -PathType Leaf
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

function Get-LanguageRoot([string]$fileFullPath) {
    $rel = Normalize-Path ($fileFullPath.Substring($root.Length).TrimStart('\','/'))
    $first = ($rel -split '/')[0]
    if ($langFolders -contains $first) { return (Join-Path $root $first) }
    return $root
}

function Get-RelativeHref([string]$fromFile, [string]$targetRel) {
    $fromDir = [IO.Path]::GetDirectoryName($fromFile)
    $targetFull = [IO.Path]::Combine($root, ($targetRel -replace '/',[IO.Path]::DirectorySeparatorChar))
    $fromUri = New-Object System.Uri ($(if ($fromDir.EndsWith('\')) { $fromDir } else { "$fromDir\" }))
    $toUri = New-Object System.Uri $targetFull
    return $fromUri.MakeRelativeUri($toUri).ToString()
}

function Resolve-HrefFromRefPage([string]$refHref, [string]$refPageRel, [string]$fromFile) {
    $refHref = Normalize-Path $refHref
    $refDir = [IO.Path]::GetDirectoryName((Join-Path $root ($refPageRel -replace '/',[IO.Path]::DirectorySeparatorChar)))
    if (-not $refDir) { $refDir = $root }
    $abs = [IO.Path]::GetFullPath((Join-Path $refDir ($refHref -replace '/',[IO.Path]::DirectorySeparatorChar)))
    if (-not (Test-Path $abs)) {
        $tryRoot = Join-Path $root ($refHref -replace '/',[IO.Path]::DirectorySeparatorChar)
        if (Test-Path $tryRoot) { $abs = $tryRoot }
    }
    return Get-RelativeHref $fromFile ($abs.Substring($root.Length).TrimStart('\','/') -replace '\\','/')
}

function Normalize-RootPath([string]$Path) {
    $p = ($Path -replace '\\', '/') -replace '^(\.\./)+', '' -replace '^https?://[^/]+/', '' -replace '^//[^/]+/', ''
    return $p.TrimStart('/')
}

function Normalize-Headline([string]$t) {
    if (-not $t) { return '' }
    $t = $t -replace '\s*-\s*China Liquid Filling Machine.*$', ''
    return ($t.Trim().ToLower() -replace '[^a-z0-9\u4e00-\u9fff]+', ' ').Trim()
}

function Get-PaginationTranslationMap([string]$relPath) {
    $rel = Normalize-Path $relPath
    foreach ($secKey in @('news')) {
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
                    if (-not $found) {
                        $home = if ($l2 -eq 'en') { 'news.html' } else { "$($sec.$l2.b).html" }
                        $result[$l2] = Resolve-BestPath $home
                    }
                }
                return $result
            }
        }
        # page 1 list (news.html, fr/nouvelles.html, ...)
        foreach ($lang in $LangOrder) {
            $cfg = $sec.$lang
            $listPage = if ($lang -eq 'en') { 'news.html' } else { "$($cfg.b).html" }
            if ($rel -eq $listPage) {
                $result = @{}
                foreach ($l2 in $LangOrder) {
                    $c2 = $sec.$l2
                    $lp = if ($l2 -eq 'en') { 'news.html' } else { "$($c2.b).html" }
                    $result[$l2] = Resolve-BestPath $lp
                }
                return $result
            }
        }
    }
    return $null
}

function Build-TranslationMap([string]$fileFullPath, [string]$html) {
    $pag = Get-PaginationTranslationMap (Normalize-Path $fileFullPath.Substring($root.Length).TrimStart('\','/'))
    if ($pag) { return $pag }
    $parsed = @{}
    $rx = [regex]'<link\s+rel="alternate"\s+hreflang="([^"]+)"\s+href="([^"]+)"\s*/?>'
    foreach ($m in $rx.Matches($html)) {
        $hl = $m.Groups[1].Value
        if (-not $HreflangToLang.ContainsKey($hl)) { continue }
        $lang = $HreflangToLang[$hl]
        $href = $m.Groups[2].Value
        if ($href -notmatch 'index\.html$' -or ($parsed.Values | Where-Object { $_ -notmatch 'index\.html' }).Count -gt 0) {
            if (-not $parsed.ContainsKey($lang)) { $parsed[$lang] = $href }
        }
    }
    if ($parsed.Count -ge 4 -and ($parsed.Values | Select-Object -Unique).Count -ge 4) {
        $out = @{}
        foreach ($k in $parsed.Keys) { $out[$k] = Resolve-BestPath $parsed[$k] }
        return $out
    }
    $fb = @{}
    foreach ($l in $LangOrder) { $fb[$l] = $LangHomes[$l] }
    return $fb
}

function Get-NewsListPagePaths {
    $list = [System.Collections.Generic.HashSet[string]]::new()
    [void]$list.Add('news.html')
    [void]$list.Add('firm-news.html')
    [void]$list.Add('industry-news.html')
    foreach ($lang in $langFolders) {
        $sec = $sections.news.$lang
        if (-not $sec) { continue }
        [void]$list.Add("$($sec.b).html")
    }
    $secEn = $sections.news.en
    $pagDir = Join-Path (Join-Path $root ($secEn.b -replace '/',[IO.Path]::DirectorySeparatorChar)) $secEn.p
    if (Test-Path $pagDir) {
        Get-ChildItem $pagDir -Filter '*.html' -File | ForEach-Object {
            $rel = $_.FullName.Substring($root.Length).TrimStart('\','/') -replace '\\','/'
            [void]$list.Add($rel)
        }
    }
    foreach ($lang in $langFolders) {
        $sec = $sections.news.$lang
        if (-not $sec) { continue }
        $pd = Join-Path (Join-Path $root ($sec.b -replace '/',[IO.Path]::DirectorySeparatorChar)) $sec.p
        if (Test-Path $pd) {
            Get-ChildItem $pd -Filter '*.html' -File | ForEach-Object {
                $rel = $_.FullName.Substring($root.Length).TrimStart('\','/') -replace '\\','/'
                [void]$list.Add($rel)
            }
        }
    }
    # localized firm/industry news
    @(
        'fr/nouvelles-entreprise.html','fr/nouvelles-industrie.html',
        'de/firmennews.html','de/branchennews.html',
        'zh/公司新闻.html','zh/行业新闻.html',
        'ru/новости-компании.html','ru/новости-индустрии.html'
    ) | ForEach-Object { if (Test-PageExists $_) { [void]$list.Add($_) } }
    return $list
}

function Parse-MenuMap([string]$html) {
    $map = @{}
    $rx = [regex]'(?:id="menu-item-(\d+)"|menu-item-(\d+)[^>]*>)\s*(?:<span[^>]*>\s*)?<a\s+href="([^"]+)"'
    foreach ($m in $rx.Matches($html)) {
        $id = if ($m.Groups[1].Success -and $m.Groups[1].Value) { $m.Groups[1].Value } else { $m.Groups[2].Value }
        if ($id -and -not $map.ContainsKey($id)) { $map[$id] = $m.Groups[3].Value }
    }
    return $map
}

Write-Host '=== Step 1: Flatten .html folders ==='
Get-ChildItem $root -Recurse -Directory | Where-Object { $_.Name -match '\.html$' } | ForEach-Object {
    $idx = Join-Path $_.FullName 'index.html'
    if (-not (Test-Path $idx)) { return }
    $parent = $_.Parent.FullName
    $flatName = $_.Name
    $flatPath = Join-Path $parent $flatName
    if (-not (Test-Path $flatPath)) {
        Move-Item $idx $flatPath -Force
        Remove-Item $_.FullName -Recurse -Force
        $stats.HtmlFolders++
        $reportLines.Add("扁平化: $($_.FullName.Substring($root.Length)) -> $flatName")
    }
}

Write-Host '=== Step 2: Build indexes ==='
$postIndex = @{}      # langRoot -> postId -> @{href, img, label}
$headlineIndex = @{}   # langRoot -> normHeadline -> relPath
$imageByPost = @{}

$htmlFiles = Get-ChildItem $root -Recurse -File -Filter '*.html' |
    Where-Object { $_.FullName -notmatch '\\wp-content\\uploads\\' }

foreach ($f in $htmlFiles) {
    $c = [IO.File]::ReadAllText($f.FullName)
    $langRoot = Get-LanguageRoot $f.FullName
    $relFromLang = ($f.FullName.Substring($langRoot.Length).TrimStart('\','/') -replace '\\','/')

    if ($c -match '"headline"\s*:\s*"([^"]+)"') {
        $hl = Normalize-Headline $Matches[1]
        if ($hl -and -not $headlineIndex.ContainsKey($langRoot)) { $headlineIndex[$langRoot] = @{} }
        if ($hl -and -not $headlineIndex[$langRoot].ContainsKey($hl)) {
            $headlineIndex[$langRoot][$hl] = $relFromLang
        }
    }
    if ($c -match '<title>([^<]+)</title>') {
        $hl = Normalize-Headline $Matches[1]
        if ($hl -and $relFromLang -notmatch '/page/|/seite/|/pagina/|/strona/|/页码/|/страница/') {
            if (-not $headlineIndex.ContainsKey($langRoot)) { $headlineIndex[$langRoot] = @{} }
            if (-not $headlineIndex[$langRoot].ContainsKey($hl)) {
                $headlineIndex[$langRoot][$hl] = $relFromLang
            }
        }
    }

    $cardRx = [regex]'<article class="(?:entry-card|wp-block-post)[^"]* post-(\d+)[^>]*>([\s\S]*?)</article>'
    foreach ($m in $cardRx.Matches($c)) {
        $postId = $m.Groups[1].Value
        $body = $m.Groups[2].Value
        $hrefM = [regex]::Match($body, 'href="([^"]+)"')
        $imgM = [regex]::Match($body, 'wp-post-image"[^>]*src="([^"]+)"')
        if (-not $imgM.Success) { $imgM = [regex]::Match($body, 'src="([^"]+)"[^>]*wp-post-image') }
        $labelM = [regex]::Match($body, 'aria-label="([^"]+)"')
        $href = if ($hrefM.Success) { Normalize-RootPath $hrefM.Groups[1].Value } else { $null }
        $img = if ($imgM.Success) { Normalize-RootPath $imgM.Groups[1].Value } else { $null }
        if ($href -match 'index\.html') { continue }
        if (-not $postIndex.ContainsKey($langRoot)) { $postIndex[$langRoot] = @{} }
        $entry = $postIndex[$langRoot][$postId]
        if (-not $entry) {
            $postIndex[$langRoot][$postId] = @{ href = $href; img = $img; label = $(if ($labelM.Success) { $labelM.Groups[1].Value } else { $null }) }
        } else {
            if ($href -and -not $entry.href) { $entry.href = $href }
            if ($img -and -not $entry.img) { $entry.img = $img }
            if ($labelM.Success -and -not $entry.label) { $entry.label = $labelM.Groups[1].Value }
        }
    }

    if ($c -match '\sid="post-(\d+)"') {
        $postId = $Matches[1]
        if (-not $postIndex.ContainsKey($langRoot)) { $postIndex[$langRoot] = @{} }
        if (-not $postIndex[$langRoot].ContainsKey($postId)) {
            $postIndex[$langRoot][$postId] = @{ href = $relFromLang; img = $null; label = $null }
        }
    }
}

Write-Host "Post IDs indexed: $(($postIndex.Values | ForEach-Object { $_.Count } | Measure-Object -Sum).Sum)"
Write-Host "=== Step 3: Fix news list pages ==="

$newsPages = Get-NewsListPagePaths
$refPages = @{
    (Join-Path $root 'news.html') = 'news.html'
}
foreach ($lang in $langFolders) {
    $b = $sections.news.$lang.b
    $p = Join-Path $root ($b + '.html')
    if (Test-Path $p) { $refPages[$p] = ($b + '.html') }
}

function Fix-EntryCards([string]$content, [string]$file, [string]$langRoot, [string]$refPageRel) {
    $rx = [regex]'(<article class="entry-card[^"]* post-(\d+)[^>]*>)([\s\S]*?)(</article>)'
    $idx = $postIndex[$langRoot]
    if (-not $idx) { return $content }
    $matches = @($rx.Matches($content))
    for ($i = $matches.Count - 1; $i -ge 0; $i--) {
        $m = $matches[$i]
        $postId = $m.Groups[2].Value
        $body = $m.Groups[3].Value
        $info = $idx[$postId]
        if (-not $info) {
            $labM = [regex]::Match($body, 'aria-label="([^"]+)"')
            if ($labM.Success -and $headlineIndex.ContainsKey($langRoot)) {
                $hk = Normalize-Headline $labM.Groups[1].Value
                if ($headlineIndex[$langRoot].ContainsKey($hk)) {
                    $info = @{ href = $headlineIndex[$langRoot][$hk]; img = $null }
                }
            }
        }
        if (-not $info -or -not $info.href) { continue }
        $targetRel = if ($langRoot -eq $root) {
            $info.href
        } else {
            (($langRoot.Substring($root.Length).TrimStart('\','/') -replace '\\','/') + '/' + $info.href)
        }
        $targetFull = Join-Path $root ($targetRel -replace '/',[IO.Path]::DirectorySeparatorChar)
        if (-not (Test-Path $targetFull)) { continue }
        $hrefRel = Get-RelativeHref $file $targetRel

        $nb = $body
        $nb2 = [regex]::Replace($nb, 'href="(?:\.\./)*(?:index\.html|news\.html|[^"]*index\.html)"', "href=`"$hrefRel`"")
        if ($nb2 -ne $nb) { $stats.EntryLinks++; $nb = $nb2 }

        if ($info.img) {
            $imgTarget = Join-Path $root ($info.img -replace '/',[IO.Path]::DirectorySeparatorChar)
            if (Test-Path $imgTarget) {
                $imgRel = Get-RelativeHref $file ($info.img)
                $nb2 = [regex]::Replace($nb, '(wp-post-image"[^>]*?)src="[^"]*"', "`${1}src=`"$imgRel`"")
                if ($nb2 -eq $nb) {
                    $nb2 = [regex]::Replace($nb, 'src="(?:\.\./)*(?:index\.html|[^"]*)"([^>]*class="[^"]*wp-post-image)', "src=`"$imgRel`"`${1}")
                }
                if ($nb2 -ne $nb) { $stats.EntryImages++; $nb = $nb2 }
                $nb2 = [regex]::Replace($nb, 'data-src="[^"]*"', "data-src=`"$imgRel`"")
                if ($nb2 -ne $nb) { $nb = $nb2 }
            }
        }
        if ($nb -ne $body) {
            $content = $content.Remove($m.Index, $m.Length).Insert($m.Index, $m.Groups[1].Value + $nb + $m.Groups[4].Value)
        }
    }
    return $content
}

function Fix-MenuByReference([string]$content, [string]$file, [hashtable]$menuMap, [string]$refPageRel) {
    if (-not $menuMap -or $menuMap.Count -eq 0) { return $content }
    foreach ($id in $menuMap.Keys) {
        $refHref = $menuMap[$id]
        $correct = Resolve-HrefFromRefPage $refHref $refPageRel $file
        $pat = '(?s)(menu-item-' + [regex]::Escape($id) + '\b.*?<a\s+href=")index\.html(")'
        $nc = [regex]::Replace($content, $pat, ('${1}' + $correct + '${2}'), 1)
        if ($nc -eq $content) {
            $pat2 = '(?s)(id="menu-item-' + [regex]::Escape($id) + '"[^>]*>.*?<a\s+href=")index\.html(")'
            $nc = [regex]::Replace($content, $pat2, ('${1}' + $correct + '${2}'), 1)
        }
        if ($nc -ne $content) { $stats.MenuLinks++; $content = $nc }
    }
    return $content
}

function Fix-HeadFromReference([string]$content, [string]$file, [string]$refHtml, [string]$refPageRel) {
    $pairs = @(
        @{ tag = 'rel="icon" href="[^"]*" sizes="32x32"'; ref = 'rel="icon" href="([^"]+)" sizes="32x32"' }
        @{ tag = 'rel="icon" href="[^"]*" sizes="192x192"'; ref = 'rel="icon" href="([^"]+)" sizes="192x192"' }
        @{ tag = 'rel="apple-touch-icon" href="[^"]*"'; ref = 'rel="apple-touch-icon" href="([^"]+)"' }
    )
    foreach ($p in $pairs) {
        $rm = [regex]::Match($refHtml, $p.ref)
        if (-not $rm.Success) { continue }
        $rel = Resolve-HrefFromRefPage $rm.Groups[1].Value $refPageRel $file
        $replacement = $rm.Value -replace [regex]::Escape($rm.Groups[1].Value), $rel
        $nc = [regex]::Replace($content, $p.tag, $replacement, 1)
        if ($nc -ne $content) { $stats.HeadLinks++; $content = $nc }
    }
    return $content
}

function Fix-PaginationNav([string]$content, [string]$file, [string]$relPath) {
    $pagMap = Get-PaginationTranslationMap $relPath
    if (-not $pagMap) { return $content }
    # detect current page number
    $pageNum = 1
    if ($relPath -match '/(\d+)(?:-2)?\.html$') { $pageNum = [int]$Matches[1] }
    $sec = $sections.news
    $lang = 'en'
    $first = ($relPath -split '/')[0]
    if ($langFolders -contains $first) { $lang = $first }
    $cfg = $sec.$lang
    $base = $cfg.b
    $pagFolder = $cfg.p

    $pageFiles = @{ 1 = if ($lang -eq 'en') { 'news.html' } else { "$base.html" } }
    Get-ChildItem (Join-Path (Join-Path $root ($base -replace '/',[IO.Path]::DirectorySeparatorChar)) $pagFolder) -Filter '*.html' -ErrorAction SilentlyContinue |
        ForEach-Object {
            $bn = [IO.Path]::GetFileNameWithoutExtension($_.Name)
            if ($bn -match '^(\d+)') { $pageFiles[[int]$Matches[1]] = (Normalize-Path $_.FullName.Substring($root.Length).TrimStart('\','/')) }
        }

    $maxPage = ($pageFiles.Keys | Measure-Object -Maximum).Maximum
    $nc = $content
    foreach ($n in $pageFiles.Keys) {
        $target = $pageFiles[$n]
        $href = Get-RelativeHref $file $target
        $nc = [regex]::Replace($nc, "(<a class=`"page-numbers`" href=`")[^`"]+(`">$n</a>)", "`${1}$href`${2}")
    }
    if ($pageNum -gt 1) {
        $prev = if ($pageNum -eq 2) { $pageFiles[1] } else { $pageFiles[$pageNum - 1] }
        if ($prev) {
            $pr = Get-RelativeHref $file $prev
            $nc = [regex]::Replace($nc, '(<a class="prev page-numbers"[^>]*href=")[^"]+(")', "`${1}$pr`${2}")
        }
    }
    if ($pageNum -lt $maxPage -and $pageFiles.ContainsKey($pageNum + 1)) {
        $nr = Get-RelativeHref $file $pageFiles[$pageNum + 1]
        $nc = [regex]::Replace($nc, '(<a class="next page-numbers"[^>]*href=")[^"]+(")', "`${1}$nr`${2}")
    }
    if ($nc -ne $content) { $stats.PaginationLinks++; $content = $nc }
    return $content
}

function Sanitize-ExternalUrls([string]$content) {
    $n = 0
    $nc = [regex]::Replace($content, 'https?://(?:www\.)?npackpm\.com([^"''\s\\]*)', {
        param($m)
        $script:n++
        $path = $m.Groups[1].Value -replace '\\/', '/'
        if ($path -match '^/wp-content/') { return $path.TrimStart('/') }
        if ($path -eq '' -or $path -eq '/') { return 'index.html' }
        return $path.TrimStart('/')
    })
    if ($script:n -gt 0) { $stats.JsSanitized += $script:n }
    return $nc
}

function Fix-CtLocalizations([string]$content, [string]$file) {
    if ($content -notmatch 'var ct_localizations') { return $content }
    $ajax = Get-RelativeHref $file 'index.html'
    $rest = '#'
    $nc = [regex]::Replace($content, '("ajax_url":")[^"]+(")', "`${1}$ajax`${2}")
    $nc = [regex]::Replace($nc, '("public_url":")[^"]+(")', "`${1}$ajax`${2}")
    $nc = [regex]::Replace($nc, '("rest_url":")[^"]+(")', "`${1}$rest`${2}")
    $nc = [regex]::Replace($nc, '("search_url":")[^"]+(")', "`${1}$rest`${2}")
    if ($nc -ne $content) { $stats.CtLoc++ }
    return $nc
}

function Fix-HreflangAndSwitcher([string]$content, [string]$file) {
    $tm = Build-TranslationMap $file $content
    $rxA = [regex]'<a\s+href="[^"]*"(\s+data-label="right"\s+aria-label="[^"]*"\s+lang="([a-z]{2}(?:-[A-Z]{2})?)")'
    $c2 = $rxA.Replace($content, {
        param($m)
        $hl = $m.Groups[2].Value
        $lc = if ($HreflangToLang.ContainsKey($hl)) { $HreflangToLang[$hl] } else { $hl.Split('-')[0].ToLower() }
        if ($tm.ContainsKey($lc)) {
            $href = Get-RelativeHref $file $tm[$lc]
            return '<a href="' + $href + '"' + $m.Groups[1].Value
        }
        return $m.Value
    })
    if ($c2 -ne $content) { $stats.Switcher++ ; $content = $c2 }
    if ($content -match 'rel="alternate"\s+hreflang=') {
        $content = [regex]::Replace($content, '<link\s+rel="alternate"\s+hreflang="[^"]+"\s+href="[^"]+"\s*/>\s*', '')
        $tags = ''
        foreach ($hl in @('en-US','fr-FR','de-DE','it-IT','es-ES','ru-RU','pl-PL','pt-PT','zh-CN')) {
            if (-not $HreflangToLang.ContainsKey($hl)) { continue }
            $lc = $HreflangToLang[$hl]
            if (-not $tm.ContainsKey($lc)) { continue }
            $href = Get-RelativeHref $file $tm[$lc]
            $tags += "<link rel=`"alternate`" hreflang=`"$hl`" href=`"$href`"/>`n"
        }
        $content = [regex]::Replace($content, '(<link rel="https://api\.w\.org/")', ($tags + '$1'), 1)
        $stats.Hreflang++
    }
    return $content
}

function Sync-LazyImages([string]$content, [string]$file) {
    $nc = [regex]::Replace($content, '<img([^>]*?)\sdata-src="([^"]+)"([^>]*?)>', {
        param($m)
        $ds = $m.Groups[2].Value
        if ($ds -match '^(https?:)?//') { $ds = Normalize-RootPath $ds }
        $imgRel = if ($ds -match '^\.\./|^wp-content/') {
            if (Test-Path (Join-Path $root (Normalize-RootPath $ds))) { Get-RelativeHref $file (Normalize-RootPath $ds) } else { $ds }
        } else { $ds }
        $tag = $m.Value
        if ($tag -notmatch '\ssrc="[^"]+wp-content' -and $tag -match 'src="index\.html"|src=""') {
            $stats.DataSrcSync++
            return "<img$($m.Groups[1].Value) src=`"$imgRel`" data-src=`"$imgRel`"$($m.Groups[3].Value)>"
        }
        return $m.Value
    })
    return $nc
}

foreach ($relPath in ($newsPages | Sort-Object)) {
    $full = Join-Path $root ($relPath -replace '/',[IO.Path]::DirectorySeparatorChar)
    if (-not (Test-Path $full)) { continue }
    $langRoot = Get-LanguageRoot $full
    $lang = if ($langRoot -eq $root) { 'en' } else { [IO.Path]::GetFileName($langRoot) }
    $refPageRel = if ($lang -eq 'en') { 'news.html' } else { "$($sections.news.$lang.b).html" }
    $refFull = Join-Path $root ($refPageRel -replace '/',[IO.Path]::DirectorySeparatorChar)
    $refHtml = if (Test-Path $refFull) { [IO.File]::ReadAllText($refFull) } else { '' }
    $menuMap = Parse-MenuMap $refHtml

    $content = [IO.File]::ReadAllText($full)
    $orig = $content

    if ($content -match '<base\s+href="[^"]*"\s*/?>') {
        $content = [regex]::Replace($content, '<base\s+href="[^"]*"\s*/?>\s*', '')
        $stats.BaseRemoved++
    }

    $content = Fix-EntryCards $content $full $langRoot $refPageRel
    if ($refHtml) {
        $content = Fix-MenuByReference $content $full $menuMap $refPageRel
        $content = Fix-HeadFromReference $content $full $refHtml $refPageRel
        # logo / home links
        $homeRel = Resolve-HrefFromRefPage 'index.html' $refPageRel $full
        $newsRel = Resolve-HrefFromRefPage $(if ($lang -eq 'en') { 'news.html' } else { $refPageRel }) $refPageRel $full
        $content = [regex]::Replace($content, '(class="site-logo-container"[^>]*href=")index\.html(")', "`${1}$homeRel`${2}")
        $content = [regex]::Replace($content, '(menu-item-809[^>]*>\s*<a\s+href=")index\.html(")', "`${1}$newsRel`${2}")
        $content = [regex]::Replace($content, '(menu-item-809[^>]*>\s*<span[^>]*>\s*<a\s+href=")index\.html(")', "`${1}$newsRel`${2}")
    }

    $content = Fix-PaginationNav $content $full $relPath
    $content = Fix-HreflangAndSwitcher $content $full
    $content = Fix-CtLocalizations $content $full
    $content = Sync-LazyImages $content $full

    # External image URLs in attributes
    $content = [regex]::Replace($content, '(src|data-src|srcset|data-lazy-src)="https?://(?:www\.)?npackpm\.com/([^"]+)"', {
        param($m)
        $stats.ImagesExternal++
        $p = Normalize-RootPath $m.Groups[2].Value
        $rel = Get-RelativeHref $full $p
        return $m.Groups[1].Value + '="' + $rel + '"'
    })

  $content = Sanitize-ExternalUrls $content

    # Breadcrumb news link
    if ($relPath -match '/(page|seite|pagina|strona|页码|страница)/') {
        $newsHref = Get-RelativeHref $full $(if ($lang -eq 'en') { 'news.html' } else { "$($sections.news.$lang.b).html" })
        $content = [regex]::Replace($content, '(ct-breadcrumbs[\s\S]*?<a href=")[^"]+("[^>]*>News)', "`${1}$newsHref`${2}", 1)
    }

    if ($content -ne $orig) {
        [IO.File]::WriteAllText($full, $content, [Text.UTF8Encoding]::new($false))
        $stats.FilesModified++
        $reportLines.Add("已修复: $relPath")
    }
}

# Run phase3 entry fix for pagination sidebars too
Write-Host '=== Step 4: Run pagination phase3 for sidebars ==='
& (Join-Path $root 'fix_pagination_phase3.ps1')

$report = @"
新闻页面修复报告
================
修改文件数: $($stats.FilesModified)
文章链接: $($stats.EntryLinks)
文章封面图: $($stats.EntryImages)
菜单链接: $($stats.MenuLinks)
页头图标等: $($stats.HeadLinks)
分页导航: $($stats.PaginationLinks)
外链图片属性: $($stats.ImagesExternal)
懒加载同步: $($stats.DataSrcSync)
Hreflang: $($stats.Hreflang)
语言切换器: $($stats.Switcher)
JS域名清理: $($stats.JsSanitized)
ct_localizations: $($stats.CtLoc)
删除base标签: $($stats.BaseRemoved)
扁平化.html目录: $($stats.HtmlFolders)

新闻列表页范围 ($($newsPages.Count) 个):
$($newsPages -join "`n")

详细:
$($reportLines -join "`n")
"@
$report | Out-File (Join-Path $root 'fix_news_pages_report.txt') -Encoding utf8
Write-Host $report
