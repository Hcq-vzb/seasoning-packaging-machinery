# Rebuild ct-pagination nav on all pagination sub-pages and first pages

$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot
$stats = @{ paginationLinks = 0; filesModified = 0 }

function Get-RelHtmlPath {
    param([string]$FromFile, [string]$ToFile)
    $fromDir = [System.IO.Path]::GetDirectoryName($FromFile)
    if (-not $fromDir.EndsWith([System.IO.Path]::DirectorySeparatorChar)) {
        $fromDir += [System.IO.Path]::DirectorySeparatorChar
    }
    return (New-Object System.Uri($fromDir)).MakeRelativeUri((New-Object System.Uri($ToFile))).ToString()
}

$htmlFiles = Get-ChildItem -Path $root -Recurse -File | Where-Object { $_.Extension -match '\.html?$' }
$paginationRx = [regex]'/(page|pagina|strona|seite|\u9875\u7801|\u0441\u0442\u0440\u0430\u043d\u0438\u0446\u0430)/'
$mirroredRx = [regex]'Mirrored from www\.npackpm\.com/([^ ]+)'
$pageNumRx = [regex]'/(?:page|pagina|strona|seite|\u9875\u7801|\u0441\u0442\u0440\u0430\u043d\u0438\u0446\u0430)/(\d+)'

function Dir-Eq {
    param([string]$A, [string]$B)
    if (-not $A -or -not $B) { return $false }
    return ([IO.Path]::GetFullPath($A).TrimEnd('\').ToLowerInvariant() -eq [IO.Path]::GetFullPath($B).TrimEnd('\').ToLowerInvariant())
}

function Norm-MirrorPath {
    param([string]$P)
    $d = [Uri]::UnescapeDataString($P).TrimEnd('/').ToLowerInvariant()
    return ([Uri]::EscapeDataString($d))
}

function Resolve-FirstPageFromMirrored {
    param([string]$MirroredUrl, [array]$AllHtmlFiles)
    $path = [Uri]::UnescapeDataString($MirroredUrl).TrimEnd('/')
    if ($path -match '/(\d+)$') { $path = $path.Substring(0, $path.LastIndexOf('/')) }
    if ($path -match '/(page|pagina|strona|seite|\u9875\u7801|\u0441\u0442\u0440\u0430\u043d\u0438\u0446\u0430)$') {
        $path = $path.Substring(0, $path.LastIndexOf('/'))
    }
    $pathNorm = Norm-MirrorPath $path
    $parts = $path -split '/'
    if ($parts.Count -ge 2) {
        $wantDir = Join-Path $root $parts[0]
        if (Test-Path -LiteralPath $wantDir) {
            $dirHits = @()
            foreach ($file in (Get-ChildItem -LiteralPath $wantDir -File -Filter '*.html')) {
                $fc = [System.IO.File]::ReadAllText($file.FullName)
                if ($fc -match 'Mirrored from www\.npackpm\.com/([^ \?#]+)') {
                    $mir = Norm-MirrorPath $Matches[1]
                    if ($mir -eq $pathNorm) { $dirHits += $file }
                }
            }
            if ($dirHits.Count -gt 0) {
                $preferred = $dirHits | Where-Object { $_.BaseName -notmatch '-\d+$' -and $_.Name -ne 'index.html' } | Sort-Object Name | Select-Object -First 1
                if ($preferred) { return $preferred.FullName }
                return $dirHits[0].FullName
            }
        }
    } elseif ($parts.Count -eq 1) {
        foreach ($file in (Get-ChildItem -LiteralPath $root -File -Filter '*.html')) {
            if ($file.BaseName -eq $parts[0]) { return $file.FullName }
        }
    }
    $hits = @()
    foreach ($hf in $AllHtmlFiles) {
        $c = [System.IO.File]::ReadAllText($hf.FullName)
        if ($c -match 'Mirrored from www\.npackpm\.com/([^ \?#]+)') {
            $m = [Uri]::UnescapeDataString($Matches[1]).TrimEnd('/')
            if ($m -eq $path) { $hits += $hf }
        }
    }
    if ($hits.Count -gt 0) {
        $parts = $path -split '/'
        if ($parts.Count -ge 2) {
            $wantDir = Join-Path $root $parts[0]
            $wantBase = $parts[-1]
            $preferred = $hits | Where-Object { (Dir-Eq $_.DirectoryName $wantDir) -and $_.BaseName -eq $wantBase } | Select-Object -First 1
            if ($preferred) { return $preferred.FullName }
        } elseif ($parts.Count -eq 1) {
            $preferred = $hits | Where-Object { (Dir-Eq $_.DirectoryName $root) -and $_.BaseName -eq $parts[0] } | Select-Object -First 1
            if ($preferred) { return $preferred.FullName }
        }
        $nonIndex = $hits | Where-Object { $_.Name -ne 'index.html' } | Select-Object -First 1
        if ($nonIndex) { return $nonIndex.FullName }
        return $hits[0].FullName
    }
    return $null
}

function Resolve-FirstPage {
    param([string]$PaginationDir)
    $parent = Split-Path $PaginationDir -Parent
    $grandparent = Split-Path $parent -Parent
    $name = Split-Path $parent -Leaf
    $candidates = @(
        (Join-Path $grandparent ($name + '.html')),
        (Join-Path $parent ($name + '.html')),
        (Join-Path $parent 'index.html'),
        (Join-Path $grandparent ($name + '.html'))
    )
    foreach ($c in $candidates) {
        if ($c -and (Test-Path -LiteralPath $c)) { return $c }
    }
    return $null
}

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
        $firstPage = $null
        if ($mm.Success) {
            $firstPage = Resolve-FirstPageFromMirrored $mm.Groups[1].Value $htmlFiles
        }
        if (-not $firstPage) { $firstPage = Resolve-FirstPage $dir }
        $sections[$dir] = @{ FirstPage = $firstPage; PageFiles = @{}; MaxPage = 0 }
    }
    $sections[$dir].PageFiles[$pageNum] = $f.FullName
    if ($pageNum -gt $sections[$dir].MaxPage) { $sections[$dir].MaxPage = $pageNum }
}

function Get-PageHref($Section, [int]$PageNum, [string]$FromFile) {
    if ($PageNum -eq 1) { return (Get-RelHtmlPath $FromFile $Section.FirstPage) }
    if ($Section.PageFiles.ContainsKey($PageNum)) {
        return (Get-RelHtmlPath $FromFile $Section.PageFiles[$PageNum])
    }
    return (Get-RelHtmlPath $FromFile $Section.FirstPage)
}

function Build-PaginationNav($Section, [int]$CurrentPage, [string]$FromFile, [string]$ExistingNav) {
    $prevLabel = 'Prev'; $nextLabel = 'Next'
    if ($ExistingNav -match '>(\u4e0a\u4e00\u4e2a|\u041f\u0440\u0435\u0434|\u041f\u0440\u0435\u0434\u044b\u0434\u0443\u0449|\u041f\u043e\u043f\u0440\u0435\u0434\u043d\u0438\u0439|\u041d\u0430\u0437\u0430\u0434|Anterior|Prec|Poprzedni)<') { $prevLabel = $Matches[1] }
    if ($ExistingNav -match '>(\u4e0b\u4e00\u4e2a|\u0421\u043b\u0435\u0434|\u0421\u043b\u0435\u0434\u0443\u044e\u0449|\u0414\u0430\u043b\u0435\u0435|Pr[oó]ximo|Nast\u0119pny)\s*<') { $nextLabel = $Matches[1] }

    $prevSvg = '<svg width="9px" height="9px" viewBox="0 0 15 15" fill="currentColor"><path d="M10.9,15c-0.2,0-0.4-0.1-0.6-0.2L3.6,8c-0.3-0.3-0.3-0.8,0-1.1l6.6-6.6c0.3-0.3,0.8-0.3,1.1,0c0.3,0.3,0.3,0.8,0,1.1L5.2,7.4l6.2,6.2c0.3,0.3,0.3,0.8,0,1.1C11.3,14.9,11.1,15,10.9,15z"/></svg>'
    $nextSvg = '<svg width="9px" height="9px" viewBox="0 0 15 15" fill="currentColor"><path d="M4.1,15c0.2,0,0.4-0.1,0.6-0.2L11.4,8c0.3-0.3,0.3-0.8,0-1.1L4.8,0.2C4.5-0.1,4-0.1,3.7,0.2C3.4,0.5,3.4,1,3.7,1.3l6.1,6.1l-6.2,6.2c-0.3,0.3-0.3,0.8,0,1.1C3.7,14.9,3.9,15,4.1,15z"/></svg>'

    $inner = ''
    if ($CurrentPage -gt 1) {
        $inner += "<a class=`"prev page-numbers`" rel=`"prev`" href=`"$(Get-PageHref $Section ($CurrentPage - 1) $FromFile)`">$prevSvg$prevLabel</a>"
        $script:stats.paginationLinks++
    }
    $inner += '<div class="ct-hidden-sm">'
    for ($p = 1; $p -le $Section.MaxPage; $p++) {
        if ($p -eq $CurrentPage) {
            $inner += "<span aria-current=`"page`" class=`"page-numbers current`">$p</span>"
        } else {
            $inner += "<a class=`"page-numbers`" href=`"$(Get-PageHref $Section $p $FromFile)`">$p</a>"
            $script:stats.paginationLinks++
        }
    }
    $inner += '</div>'
    if ($CurrentPage -lt $Section.MaxPage) {
        $inner += "<a class=`"next page-numbers`" rel=`"next`" href=`"$(Get-PageHref $Section ($CurrentPage + 1) $FromFile)`">$nextLabel $nextSvg</a>"
        $script:stats.paginationLinks++
    }
    return "<nav class=`"ct-pagination`" data-pagination=`"simple`"  >`n`t`t`t$inner`n`t`t`t`n`t`t</nav>"
}

foreach ($sec in $sections.Values) {
    if (-not $sec.FirstPage -or -not (Test-Path -LiteralPath $sec.FirstPage)) { continue }

    # First page nav
    $fpContent = [System.IO.File]::ReadAllText($sec.FirstPage)
    $navM = [regex]::Match($fpContent, '<nav class="ct-pagination"[^>]*>[\s\S]*?</nav>', [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)
    if ($navM.Success -and $sec.MaxPage -ge 2) {
        $inner = '<div class="ct-hidden-sm"><span aria-current="page" class="page-numbers current">1</span>'
        for ($p = 2; $p -le $sec.MaxPage; $p++) {
            if ($sec.PageFiles.ContainsKey($p)) {
                $href = Get-RelHtmlPath $sec.FirstPage $sec.PageFiles[$p]
                $inner += "<a class=`"page-numbers`" href=`"$href`">$p</a>"
                $stats.paginationLinks++
            }
        }
        $inner += '</div>'
        if ($sec.PageFiles.ContainsKey(2)) {
            $nextHref = Get-RelHtmlPath $sec.FirstPage $sec.PageFiles[2]
            $nextLabel = if ($navM.Value -match 'next page-numbers[^>]*>([^<]+)<') { $Matches[1].Trim() } else { 'Next' }
            $nextSvg = '<svg width="9px" height="9px" viewBox="0 0 15 15" fill="currentColor"><path d="M4.1,15c0.2,0,0.4-0.1,0.6-0.2L11.4,8c0.3-0.3,0.3-0.8,0-1.1L4.8,0.2C4.5-0.1,4-0.1,3.7,0.2C3.4,0.5,3.4,1,3.7,1.3l6.1,6.1l-6.2,6.2c-0.3,0.3-0.3,0.8,0,1.1C3.7,14.9,3.9,15,4.1,15z"/></svg>'
            $inner += "<a class=`"next page-numbers`" rel=`"next`" href=`"$nextHref`">$nextLabel $nextSvg</a>"
            $stats.paginationLinks++
        }
        $newNav = "<nav class=`"ct-pagination`" data-pagination=`"simple`"  >`n`t`t`t$inner`n`t`t`t`n`t`t</nav>"
        $newFp = $fpContent.Remove($navM.Index, $navM.Length).Insert($navM.Index, $newNav)
        if ($newFp -ne $fpContent) {
            [System.IO.File]::WriteAllText($sec.FirstPage, $newFp)
            $stats.filesModified++
        }
    }

    foreach ($kv in $sec.PageFiles.GetEnumerator()) {
        $pageNum = [int]$kv.Key
        $file = $kv.Value
        $content = [System.IO.File]::ReadAllText($file)
        $navM = [regex]::Match($content, '<nav class="ct-pagination"[^>]*>[\s\S]*?</nav>', [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)
        if (-not $navM.Success) { continue }
        $newNav = Build-PaginationNav $sec $pageNum $file $navM.Value
        $newContent = $content.Remove($navM.Index, $navM.Length).Insert($navM.Index, $newNav)
        [System.IO.File]::WriteAllText($file, $newContent)
        $stats.filesModified++
    }
}

Write-Host "Pagination nav fixed: $($stats.paginationLinks) links in $($stats.filesModified) files"
Write-Host "Sections: $($sections.Count)"
foreach ($sec in $sections.Values) {
    if ($sec.FirstPage -match '\\zh\\') {
        Write-Host "  ZH first: $($sec.FirstPage)"
    }
}
