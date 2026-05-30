# Phase 3: Hero banner, sidebar posts, rel prev/next, footer cert image

$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot
$stats = @{ images = 0; links = 0; headLinks = 0; files = 0 }
$script:stats = $stats

function Get-RelHtmlPath {
    param([string]$FromFile, [string]$ToFile)
    $fromDir = [System.IO.Path]::GetDirectoryName($FromFile)
    if (-not $fromDir.EndsWith([System.IO.Path]::DirectorySeparatorChar)) {
        $fromDir += [System.IO.Path]::DirectorySeparatorChar
    }
    return (New-Object System.Uri($fromDir)).MakeRelativeUri((New-Object System.Uri($ToFile))).ToString()
}

function Normalize-RootPath {
    param([string]$Path)
    $p = ($Path -replace '\\', '/') -replace '^(\.\./)+', '' -replace '^https?://[^/]+/', ''
    return $p.TrimStart('/')
}

function Get-LanguageRoot {
    param([string]$FilePath)
    $rel = ($FilePath.Substring($root.Length).TrimStart('\', '/') -replace '\\', '/')
    $parts = $rel -split '/'
    $langs = @('zh', 'pl', 'pt', 'es', 'it', 'fr', 'ru', 'de')
    if ($parts.Count -gt 0 -and $langs -contains $parts[0]) { return (Join-Path $root $parts[0]) }
    return $root
}

Write-Host "Building post index..."
$postIndex = @{}
$htmlFiles = Get-ChildItem -Path $root -Recurse -File | Where-Object { $_.Extension -match '\.html?$' }

foreach ($f in $htmlFiles) {
    $c = [System.IO.File]::ReadAllText($f.FullName)
    $langRoot = Get-LanguageRoot $f.FullName

    foreach ($pattern in @(
        'article class="entry-card[^"]* post-(\d+)[^>]*>.*?wp-post-image"[^>]*src="([^"]+)"',
        'article class="wp-block-post[^"]* post-(\d+)[^>]*>.*?wp-post-image"[^>]*src="([^"]+)"'
    )) {
        $rx = [regex]$pattern
        foreach ($m in $rx.Matches($c)) {
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
    }

    if ($c -match '\sid="post-(\d+)"') {
        $postId = $Matches[1]
        $relFromLang = ($f.FullName.Substring($langRoot.Length).TrimStart('\', '/') -replace '\\', '/')
        if (-not $postIndex.ContainsKey($langRoot)) { $postIndex[$langRoot] = @{} }
        if (-not $postIndex[$langRoot].ContainsKey($postId)) {
            $postIndex[$langRoot][$postId] = @{ href = $relFromLang; img = $null }
        }
    }
}

$paginationRx = [regex]'/(page|pagina|strona|seite|\u9875\u7801|\u0441\u0442\u0440\u0430\u043d\u0438\u0446\u0430)/'
$mirroredRx = [regex]'Mirrored from www\.npackpm\.com/([^ ]+)'
$pageNumRx = [regex]'/(?:page|pagina|strona|seite|\u9875\u7801|\u0441\u0442\u0440\u0430\u043d\u0438\u0446\u0430)/(\d+)'

$sections = @{}
foreach ($f in $htmlFiles) {
    $rel = ($f.FullName.Substring($root.Length).TrimStart('\', '/') -replace '\\', '/')
    if ($rel -notmatch $paginationRx) { continue }
    $c = [System.IO.File]::ReadAllText($f.FullName)
    $pageNum = $null
    $mm = $mirroredRx.Match($c)
    if ($mm.Success) {
        $pm = $pageNumRx.Match($mm.Groups[1].Value)
        if ($pm.Success) { $pageNum = [int]$pm.Groups[1].Value }
    }
    if (-not $pageNum) {
        $base = [System.IO.Path]::GetFileNameWithoutExtension($f.Name)
        if ($base -match '^(\d+)') { $pageNum = [int]$Matches[1] }
    }
    if (-not $pageNum) { continue }
    $dir = [System.IO.Path]::GetDirectoryName($f.FullName)
    if (-not $sections.ContainsKey($dir)) {
        $dirRel = ($dir.Substring($root.Length).TrimStart('\', '/') -replace '\\', '/')
        $parts = $dirRel -split '/'
        $catPath = ($parts[0..($parts.Length - 2)] -join '/')
        $firstPage = Join-Path $root ($catPath + '.html')
        $sections[$dir] = @{ FirstPage = $firstPage; PageFiles = @{}; MaxPage = 0 }
    }
    $sections[$dir].PageFiles[$pageNum] = $f.FullName
    if ($pageNum -gt $sections[$dir].MaxPage) { $sections[$dir].MaxPage = $pageNum     }
}

$script:postIndex = $postIndex

function Fix-PostBlocks {
    param([string]$Content, [string]$File, [string]$LangRoot, [string]$Pattern)
    $rx = [regex]$Pattern
    $matches = @($rx.Matches($Content))
    $idx = $script:postIndex[$LangRoot]
    if (-not $idx -or $matches.Count -eq 0) { return $Content }

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
            $nb = [regex]::Replace($body, 'href="(?:\.\./)*(?:index\.html|[^"]*index\.html)"', "href=`"$hrefRel`"")
            if ($nb -ne $body) { $body = $nb; $script:stats.links++; $changed = $true }
        }
        if ($info.img) {
            $imgTarget = Join-Path $root ($info.img -replace '/', [System.IO.Path]::DirectorySeparatorChar)
            $imgRel = Get-RelHtmlPath $File $imgTarget
            $nb = [regex]::Replace($body, 'src="(?:\.\./)*(?:index\.html|[^"]*index\.html)"', "src=`"$imgRel`"")
            if ($nb -ne $body) { $body = $nb; $script:stats.images++; $changed = $true }
        }
        if ($changed) {
            $rep = $m.Groups[1].Value + $body + $m.Groups[4].Value
            $Content = $Content.Remove($m.Index, $m.Length).Insert($m.Index, $rep)
        }
    }
    return $Content
}

Write-Host "Fixing remaining pagination page assets..."
foreach ($f in $htmlFiles) {
    $rel = ($f.FullName.Substring($root.Length).TrimStart('\', '/') -replace '\\', '/')
    if ($rel -notmatch $paginationRx) { continue }

    $content = [System.IO.File]::ReadAllText($f.FullName)
    $orig = $content
    $langRoot = Get-LanguageRoot $f.FullName

    $parts = ([System.IO.Path]::GetDirectoryName($rel) -replace '\\', '/') -split '/'
    $catPath = ($parts[0..($parts.Length - 2)] -join '/')
    $firstPage = Join-Path $root ($catPath + '.html')

    # Hero image from first page
    if (Test-Path $firstPage) {
        $fp = [System.IO.File]::ReadAllText($firstPage)
        if ($fp -match '<img[^>]*src="((?:\.\./)*wp-content/uploads/[^"]+)"[^>]*class="attachment-full size-full"') {
            $hero = Normalize-RootPath $Matches[1]
            $heroRel = Get-RelHtmlPath $f.FullName (Join-Path $root ($hero -replace '/', [System.IO.Path]::DirectorySeparatorChar))
            $nc = [regex]::Replace($content, '<img([^>]*?)src="(?:\.\./)*(?:index\.html|[^"]*)"([^>]*?)class="attachment-full size-full"', "<img`${1}src=`"$heroRel`"`${2}class=`"attachment-full size-full`"")
            if ($nc -eq $content) {
                $nc = [regex]::Replace($content, '<img([^>]*?)class="attachment-full size-full"([^>]*?)src="(?:\.\./)*(?:index\.html|[^"]*)"', "<img`${1}class=`"attachment-full size-full`"`${2}src=`"$heroRel`"")
            }
            if ($nc -ne $content) { $content = $nc; $stats.images++ }
        }
    }

    # Sidebar wp-block-post
    $content = Fix-PostBlocks $content $f.FullName $langRoot '(<article class="wp-block-post[^"]* post-(\d+)[^>]*>)([\s\S]*?)(</article>)'

    # Footer cert image
    $certRel = Get-RelHtmlPath $f.FullName (Join-Path $root 'wp-content/uploads/2025/10/2025102005594677.png')
    $nc = [regex]::Replace($content, '(class="wp-image-4038"[^>]*?)src="(?:\.\./)*(?:index\.html|[^"]*)"', "`${1}src=`"$certRel`"")
    if ($nc -eq $content) {
        $nc = [regex]::Replace($content, 'src="(?:\.\./)*(?:index\.html|[^"]*)"([^>]*class="wp-image-4038")', "src=`"$certRel`"`${1}")
    }
    if ($nc -ne $content) { $content = $nc; $stats.images++ }

    # rel prev/next in head
    $dir = [System.IO.Path]::GetDirectoryName($f.FullName)
    if ($sections.ContainsKey($dir)) {
        $sec = $sections[$dir]
        $pageNum = $null
        $mm = $mirroredRx.Match($content)
        if ($mm.Success) {
            $pm = $pageNumRx.Match($mm.Groups[1].Value)
            if ($pm.Success) { $pageNum = [int]$pm.Groups[1].Value }
        }
        if (-not $pageNum) {
            $base = [System.IO.Path]::GetFileNameWithoutExtension($f.Name)
            if ($base -match '^(\d+)') { $pageNum = [int]$Matches[1] }
        }
        if ($pageNum) {
            if ($pageNum -gt 1) {
                $prevNum = $pageNum - 1
                $prevFile = if ($prevNum -eq 1) { $sec.FirstPage } else { $sec.PageFiles[$prevNum] }
                if ($prevFile) {
                    $prevRel = Get-RelHtmlPath $f.FullName $prevFile
                    $content = [regex]::Replace($content, '<link rel="prev" href="[^"]*"', "<link rel=`"prev`" href=`"$prevRel`"")
                    $stats.headLinks++
                }
            }
            if ($pageNum -lt $sec.MaxPage) {
                $nextFile = $sec.PageFiles[$pageNum + 1]
                if ($nextFile) {
                    $nextRel = Get-RelHtmlPath $f.FullName $nextFile
                    $content = [regex]::Replace($content, '<link rel="next" href="[^"]*"', "<link rel=`"next`" href=`"$nextRel`"")
                    $stats.headLinks++
                }
            }
        }
    }

    if ($content -ne $orig) {
        [System.IO.File]::WriteAllText($f.FullName, $content)
        $stats.files++
    }
}

Write-Host ""
Write-Host "========== PHASE 3 REPORT =========="
Write-Host "Files modified:  $($stats.files)"
Write-Host "Sidebar links:   $($stats.links)"
Write-Host "Images fixed:    $($stats.images)"
Write-Host "Head prev/next:  $($stats.headLinks)"
Write-Host "===================================="
