# Fix sidebar Recent Posts on pagination pages via aria-label index

$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot
$stats = @{ links = 0; images = 0; files = 0 }

function Get-RelHtmlPath {
    param([string]$FromFile, [string]$ToFile)
    $fromDir = [IO.Path]::GetDirectoryName($FromFile)
    if (-not $fromDir.EndsWith([IO.Path]::DirectorySeparatorChar)) { $fromDir += [IO.Path]::DirectorySeparatorChar }
    return (New-Object Uri($fromDir)).MakeRelativeUri((New-Object Uri($ToFile))).ToString()
}

function Normalize-RootPath {
    param([string]$Path)
    $p = ($Path -replace '\\', '/') -replace '^(\.\./)+', '' -replace '^https?://[^/]+/', ''
    return $p.TrimStart('/')
}

$htmlFiles = Get-ChildItem -Path $root -Recurse -File | Where-Object { $_.Extension -match '\.html?$' }
$ariaIndex = @{}

foreach ($f in $htmlFiles) {
    $c = [IO.File]::ReadAllText($f.FullName)
    $rx = [regex]'aria-label="([^"]+)"[^>]*href="([^"]+)"[^>]*>.*?<img[^>]*src="([^"]+)"'
    foreach ($m in $rx.Matches($c)) {
        $label = $m.Groups[1].Value
        $href = Normalize-RootPath $m.Groups[2].Value
        $img = Normalize-RootPath $m.Groups[3].Value
        if ($href -and $img -and $href -notmatch 'index\.html' -and $img -notmatch 'index\.html') {
            if (-not $ariaIndex.ContainsKey($label)) {
                $ariaIndex[$label] = @{ href = $href; img = $img }
            }
        }
    }
}

$script:stats = $stats
$script:ariaIndex = $ariaIndex
$script:root = $root
Write-Host "Aria index: $($ariaIndex.Count) entries"
$paginationRx = [regex]'/(page|pagina|strona|seite|\u9875\u7801|\u0441\u0442\u0440\u0430\u043d\u0438\u0446\u0430)/'

foreach ($f in $htmlFiles) {
    $rel = ($f.FullName.Substring($root.Length).TrimStart('\', '/') -replace '\\', '/')
    if ($rel -notmatch $paginationRx) { continue }
    $script:fixFile = $f.FullName
    $content = [IO.File]::ReadAllText($f.FullName)
    $orig = $content

    $content = [regex]::Replace($content, '(aria-label="([^"]+)"[^>]*href=")(?:\.\./)*(?:index\.html|[^"]*index\.html)(")', {
        param($m)
        $label = $m.Groups[2].Value
        if (-not $script:ariaIndex.ContainsKey($label)) { return $m.Value }
        $info = $script:ariaIndex[$label]
        $hrefRel = Get-RelHtmlPath $script:fixFile (Join-Path $script:root ($info.href -replace '/', [IO.Path]::DirectorySeparatorChar))
        $script:stats.links++
        return $m.Groups[1].Value + $hrefRel + $m.Groups[3].Value
    })

    $content = [regex]::Replace($content, '(class="ct-dynamic-media[^"]*"[^>]*aria-label="([^"]+)"[^>]*>.*?<img[^>]*src=")(?:\.\./)*(?:index\.html|[^"]*index\.html)(")', {
        param($m)
        $label = $m.Groups[2].Value
        if (-not $script:ariaIndex.ContainsKey($label)) { return $m.Value }
        $info = $script:ariaIndex[$label]
        $imgRel = Get-RelHtmlPath $script:fixFile (Join-Path $script:root ($info.img -replace '/', [IO.Path]::DirectorySeparatorChar))
        $script:stats.images++
        return $m.Groups[1].Value + $imgRel + $m.Groups[3].Value
    })

    if ($content -ne $orig) {
        [IO.File]::WriteAllText($f.FullName, $content)
        $script:stats.files++
    }
}

Write-Host "Sidebar fixed: $($stats.links) links, $($stats.images) images in $($stats.files) files"
