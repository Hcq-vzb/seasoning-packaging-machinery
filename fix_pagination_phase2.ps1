# Phase 2: Fix entry cards, hero images, flags, broken CSS href on pagination pages

$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot
$stats = @{ entryLinks = 0; imagePaths = 0; cssFixed = 0; filesModified = 0 }

function Get-RelHtmlPath {
    param([string]$FromFile, [string]$ToFile)
    $fromDir = [System.IO.Path]::GetDirectoryName($FromFile)
    if (-not $fromDir.EndsWith([System.IO.Path]::DirectorySeparatorChar)) {
        $fromDir += [System.IO.Path]::DirectorySeparatorChar
    }
    $fromUri = New-Object System.Uri($fromDir)
    $toUri = New-Object System.Uri($ToFile)
    return $fromUri.MakeRelativeUri($toUri).ToString()
}

function Normalize-RootPath {
    param([string]$Path)
    if ([string]::IsNullOrWhiteSpace($Path)) { return $null }
    $p = $Path -replace '\\', '/'
    $p = $p -replace '^(\.\./)+', ''
    $p = $p -replace '^https?://[^/]+/', ''
    return $p.TrimStart('/')
}

function Get-FeaturedImageFromHtml {
    param([string]$Html)
    if ($Html -match 'preload\s+as="image"\s+href="([^"]+)"') {
        return (Normalize-RootPath $Matches[1])
    }
    if ($Html -match 'background-image:url\("((?:\.\./)*wp-content/uploads/[^"]+)"\)') {
        return (Normalize-RootPath $Matches[1])
    }
    if ($Html -match 'class="[^"]*wp-post-image[^"]*"[^>]*src="((?:\.\./)*wp-content/uploads/[^"]+)"') {
        return (Normalize-RootPath $Matches[1])
    }
    return $null
}

function Get-LanguageRoot {
    param([string]$FilePath)
    $rel = ($FilePath.Substring($root.Length).TrimStart('\', '/') -replace '\\', '/')
    $parts = $rel -split '/'
    $langs = @('zh', 'pl', 'pt', 'es', 'it', 'fr', 'ru', 'de')
    if ($parts.Count -gt 0 -and $langs -contains $parts[0]) {
        return (Join-Path $root $parts[0])
    }
    return $root
}

Write-Host "Building post ID index..."
$postIndex = @{}
$htmlFiles = Get-ChildItem -Path $root -Recurse -File | Where-Object { $_.Extension -match '\.html?$' }

foreach ($f in $htmlFiles) {
    $content = [System.IO.File]::ReadAllText($f.FullName)
    $langRoot = Get-LanguageRoot $f.FullName

    $cardRx = [regex]'article class="entry-card[^"]* post-(\d+)[^>]*>.*?wp-post-image"[^>]*src="([^"]+)"'
    foreach ($m in $cardRx.Matches($content)) {
        $postId = $m.Groups[1].Value
        $src = Normalize-RootPath $m.Groups[2].Value
        if (-not $src -or $src -match 'index\.html') { continue }
        $hrefM = [regex]::Match($m.Value, 'href="([^"]+)"')
        if (-not $hrefM.Success) { continue }
        $href = Normalize-RootPath $hrefM.Groups[1].Value
        if (-not $href -or $href -match 'index\.html') { continue }
        if (-not $postIndex.ContainsKey($langRoot)) { $postIndex[$langRoot] = @{} }
        if (-not $postIndex[$langRoot].ContainsKey($postId)) {
            $postIndex[$langRoot][$postId] = @{ href = $href; img = $src }
        }
    }

    if ($content -match '\sid="post-(\d+)"') {
        $postId = $Matches[1]
        $relFromLang = ($f.FullName.Substring($langRoot.Length).TrimStart('\', '/') -replace '\\', '/')
        $img = Get-FeaturedImageFromHtml $content
        if (-not $postIndex.ContainsKey($langRoot)) { $postIndex[$langRoot] = @{} }
        if (-not $postIndex[$langRoot].ContainsKey($postId)) {
            $postIndex[$langRoot][$postId] = @{ href = $relFromLang; img = $img }
        } else {
            if (-not $postIndex[$langRoot][$postId].img -and $img) {
                $postIndex[$langRoot][$postId].img = $img
            }
            if (-not $postIndex[$langRoot][$postId].href) {
                $postIndex[$langRoot][$postId].href = $relFromLang
            }
        }
    }
}

Write-Host "  Indexed: $(($postIndex.Values | ForEach-Object { $_.Count } | Measure-Object -Sum).Sum) posts"

$paginationRx = [regex]'/(page|pagina|strona|seite|\u9875\u7801|\u0441\u0442\u0440\u0430\u043d\u0438\u0446\u0430)/'
$mirroredRx = [regex]'Mirrored from www\.npackpm\.com/([^ ]+)'
$pageNumRx = [regex]'/(?:page|pagina|strona|seite|\u9875\u7801|\u0441\u0442\u0440\u0430\u043d\u0438\u0446\u0430)/(\d+)'

function Fix-EntryCards {
    param([string]$Content, [string]$File, [string]$LangRoot)
    $articleRx = [regex]'(<article class="entry-card[^"]* post-(\d+)[^>]*>)([\s\S]*?)(</article>)'
    $matches = @($articleRx.Matches($Content))
    if ($matches.Count -eq 0) { return $Content }

    $idx = $postIndex[$LangRoot]
    if (-not $idx) { return $Content }

    for ($i = $matches.Count - 1; $i -ge 0; $i--) {
        $m = $matches[$i]
        $postId = $m.Groups[2].Value
        if (-not $idx.ContainsKey($postId)) { continue }

        $info = $idx[$postId]
        $body = $m.Groups[3].Value
        $changed = $false

        if ($info.href) {
            $target = Join-Path $LangRoot ($info.href -replace '/', [System.IO.Path]::DirectorySeparatorChar)
            $hrefRel = Get-RelHtmlPath $File $target
            $newBody = [regex]::Replace($body, 'href="(?:\.\./)*(?:index\.html|[^"]*index\.html)"', "href=`"$hrefRel`"")
            if ($newBody -ne $body) { $script:stats.entryLinks++; $body = $newBody; $changed = $true }
        }

        if ($info.img) {
            $imgTarget = Join-Path $root ($info.img -replace '/', [System.IO.Path]::DirectorySeparatorChar)
            $imgRel = Get-RelHtmlPath $File $imgTarget
            $newBody = [regex]::Replace($body, 'src="(?:\.\./)*(?:index\.html|[^"]*index\.html)"', "src=`"$imgRel`"")
            if ($newBody -ne $body) { $script:stats.imagePaths++; $body = $newBody; $changed = $true }
        }

        if ($changed) {
            $replacement = $m.Groups[1].Value + $body + $m.Groups[4].Value
            $Content = $Content.Remove($m.Index, $m.Length).Insert($m.Index, $replacement)
        }
    }
    return $Content
}

function Get-HeroImageFromFirstPage {
    param([string]$FirstPageFile)
    if (-not (Test-Path $FirstPageFile)) { return $null }
    $html = [System.IO.File]::ReadAllText($FirstPageFile)
    if ($html -match 'class="attachment-full size-full"[^>]*src="((?:\.\./)*wp-content/uploads/[^"]+)"') {
        return (Normalize-RootPath $Matches[1])
    }
    return $null
}

Write-Host "Fixing pagination pages..."
foreach ($f in $htmlFiles) {
    $rel = ($f.FullName.Substring($root.Length).TrimStart('\', '/') -replace '\\', '/')
    if ($rel -notmatch $paginationRx) { continue }

    $content = [System.IO.File]::ReadAllText($f.FullName)
    $orig = $content
    $langRoot = Get-LanguageRoot $f.FullName

    # Determine first page for hero image
    $parts = ([System.IO.Path]::GetDirectoryName($rel) -replace '\\', '/') -split '/'
    $catPath = ($parts[0..($parts.Length - 2)] -join '/')
    $firstPage = Join-Path $root ($catPath + '.html')
    if (-not (Test-Path $firstPage)) { $firstPage = Join-Path $root (Join-Path $catPath 'index.html') }

    $content = Fix-EntryCards $content $f.FullName $langRoot

    # Hero banner image
    $heroImg = Get-HeroImageFromFirstPage $firstPage
    if ($heroImg) {
        $heroRel = Get-RelHtmlPath $f.FullName (Join-Path $root ($heroImg -replace '/', [System.IO.Path]::DirectorySeparatorChar))
        $newC = [regex]::Replace($content, '(class="attachment-full size-full"[^>]*src=")(?:\.\./)*(?:index\.html|[^"]*)(")', "`${1}$heroRel`${2}")
        if ($newC -ne $content) { $content = $newC; $stats.imagePaths++ }
    }

    # Logo
    $logoPath = Get-RelHtmlPath $f.FullName (Join-Path $root 'wp-content/uploads/2025/10/npack.png.webp')
    $content = [regex]::Replace($content, '(class="default-logo"[^>]*src=")(?:\.\./)*(?:index\.html|[^"]*)(")', "`${1}$logoPath`${2}")
    $content = [regex]::Replace($content, '(src=")(?:\.\./)*(?:index\.html|[^"]*)("[^>]*class="default-logo")', "`${1}$logoPath`${2}")

    # Site logo home link
    $homeRel = Get-RelHtmlPath $f.FullName (Join-Path $langRoot 'index.html')
    if (-not (Test-Path (Join-Path $langRoot 'index.html'))) {
        $homeRel = Get-RelHtmlPath $f.FullName (Join-Path $root 'index.html')
    }
    $content = [regex]::Replace($content, '(class="site-logo-container"[^>]*href=")(?:\.\./)*(?:index\.html|[^"]*)(")', "`${1}$homeRel`${2}")

    # Language flags
    $script:flagBase = Get-RelHtmlPath $f.FullName (Join-Path $root 'wp-content/plugins/translatepress-multilingual/assets/flags/4x3')
    $content = [regex]::Replace($content, '<a([^>]*lang="([a-z]{2})-([A-Z]{2})"[^>]*)>((?:(?!</a>).)*?)<img([^>]*?)src="(?:\.\./)*(?:index\.html|[^"]*)"([^>]*width="18" height="12"[^>]*)>', {
        param($m)
        $flag = "$($m.Groups[2].Value)_$($m.Groups[3].Value)"
        $flagSrc = "$($script:flagBase)/$flag.svg"
        return "<a$($m.Groups[1].Value)>$($m.Groups[4].Value)<img$($m.Groups[5].Value)src=`"$flagSrc`"$($m.Groups[6].Value)>"
    })
    $content = [regex]::Replace($content, '<div([^>]*lang="([a-z]{2})-([A-Z]{2})"[^>]*)>((?:(?!</div>).)*?)<img([^>]*?)src="(?:\.\./)*(?:index\.html|[^"]*)"([^>]*width="18" height="12")', {
        param($m)
        $flag = "$($m.Groups[2].Value)_$($m.Groups[3].Value)"
        $flagSrc = "$($script:flagBase)/$flag.svg"
        return "<div$($m.Groups[1].Value)>$($m.Groups[4].Value)<img$($m.Groups[5].Value)src=`"$flagSrc`"$($m.Groups[6].Value)"
    })

    # Breadcrumb home
    $content = [regex]::Replace($content, '(<nav class="ct-breadcrumbs"[^>]*>.*?first-item.*?<a href=")(?:\.\./)*(?:index\.html|[^"]*)(")', "`${1}$homeRel`${2}")
    $content = [regex]::Replace($content, '(itemprop="url" content=")(?:\.\./)*wp-content/uploads/2025/10/npack\.png\.webp(")', "`${1}$homeRel`${2}")

    # Product list breadcrumb link
    if (Test-Path $firstPage) {
        $listRel = Get-RelHtmlPath $f.FullName $firstPage
        $content = [regex]::Replace($content, '(ct-breadcrumbs[\s\S]*?<a href=")(?:\.\./)*(?:index\.html|[^"]*)("(?:[^>]*>[^<]*Product|[^<]*\u4ea7\u54c1))', "`${1}$listRel`${2}")
    }

    # Fix broken pagination CSS href
    $cssRel = Get-RelHtmlPath $f.FullName (Join-Path $root 'wp-content/themes/blocksy/static/bundle/pagination.min0805.css')
    $cssHref = $cssRel + '?ver=2.1.42'
    if ($content -match "id='ct-pagination-styles-css'") {
        $newCss = "id='ct-pagination-styles-css' href='$cssHref'"
        $content = [regex]::Replace($content, "id='ct-pagination-styles-css' href='[^']*'", $newCss)
        $stats.cssFixed++
    }

    if ($content -ne $orig) {
        [System.IO.File]::WriteAllText($f.FullName, $content)
        $stats.filesModified++
    }
}

Write-Host ""
Write-Host "========== PHASE 2 REPORT =========="
Write-Host "Files modified:    $($stats.filesModified)"
Write-Host "Entry card links:  $($stats.entryLinks)"
Write-Host "Image paths fixed: $($stats.imagePaths)"
Write-Host "CSS href fixed:    $($stats.cssFixed)"
Write-Host "====================================="
