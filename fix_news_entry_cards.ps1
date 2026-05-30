$ErrorActionPreference = 'Stop'
$root = (Resolve-Path $PSScriptRoot).Path
$manualPostMap = @{
    '3710' = 'what-are-capsules-and-how-to-fill-capsules.html'
    '3703' = 'what-are-the-advantages-of-automatic-filling-machine.html'
    '3694' = 'bee-pollen.html'
    '3653' = 'shampoo-production-processing-equipments.html'
    '3639' = 'how-to-choose-a-liquid-filling-machine.html'
    '3633' = 'how-to-choose-an-edible-oil-filling-machine.html'
    '3615' = 'analysis-of-corrosion-reasons-and-anti-corrosion-methods-for-chemical-production-equipment.html'
}

function Get-Rel([string]$fromFile, [string]$targetRel) {
    $fd = [IO.Path]::GetDirectoryName($fromFile)
    if (-not $fd) { $fd = $root }
    $fromUri = New-Object Uri ([IO.Path]::GetFullPath($fd + '\'))
    $toUri = New-Object Uri ([IO.Path]::GetFullPath((Join-Path $root ($targetRel -replace '/', '\'))))
    return $fromUri.MakeRelativeUri($toUri).ToString()
}

function Get-DetailImage([string]$detailHtml) {
    if ($detailHtml -match '"image"\s*:\s*\{[^}]*"url"\s*:\s*"((?:[^"\\]|\\.)+)"') {
        return ($Matches[1] -replace '\\/', '/')
    }
    if ($detailHtml -match 'wp-block-image[^>]*>[\s\S]*?<img[^>]*src="([^"]+)"') {
        return ($Matches[1] -replace '^https?://[^/]+/', '')
    }
    if ($detailHtml -match 'wp-post-image"[^>]*src="([^"]+)"') {
        return ($Matches[1] -replace '^https?://[^/]+/', '')
    }
    return $null
}

function Ensure-Image([string]$relPath) {
    $full = Join-Path $root ($relPath -replace '/', '\')
    if (Test-Path $full) { return }
    $dir = [IO.Path]::GetDirectoryName($full)
    if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }
    $url = 'https://www.npackpm.com/' + ($relPath -replace '\\', '/')
    & curl.exe -fsSL -o $full $url 2>$null
}

$pages = @(
    (Get-ChildItem (Join-Path $root 'news\page') -Filter '*.html' -File -ErrorAction SilentlyContinue)
) + @(Get-ChildItem $root -Recurse -Filter '*.html' -File | Where-Object {
    $_.FullName -match 'nouvelles[\\/]page|nachrichten[\\/]seite|noticias[\\/]pagina|notizie[\\/]pagina|wiadomosci[\\/]strona|новости|新闻[\\/]页码'
})

$fixed = 0
foreach ($file in $pages) {
    $content = [IO.File]::ReadAllText($file.FullName)
    $orig = $content
    $rx = [regex]'(<article class="entry-card[^"]* post-(\d+)[^>]*>)([\s\S]*?)(</article>)'
    $matches = @($rx.Matches($content))
    for ($i = $matches.Count - 1; $i -ge 0; $i--) {
        $m = $matches[$i]
        $postId = $m.Groups[2].Value
        if (-not $manualPostMap.ContainsKey($postId)) { continue }
        $slug = $manualPostMap[$postId]
        $detailPath = Join-Path $root $slug
        if (-not (Test-Path $detailPath)) { continue }
        $detail = [IO.File]::ReadAllText($detailPath)
        $img = Get-DetailImage $detail
        if ($img) { Ensure-Image $img }
        $hrefRel = Get-Rel $file.FullName $slug
        $body = $m.Groups[3].Value
        $body = [regex]::Replace($body, '(ct-media-container[^>]*href=")[^"]+(")', "`${1}$hrefRel`${2}")
        $body = [regex]::Replace($body, '(class="entry-title"[^>]*>\s*<a href=")[^"]+(")', "`${1}$hrefRel`${2}")
        if ($img) {
            $imgRel = Get-Rel $file.FullName $img
            $body = [regex]::Replace($body, '(wp-post-image"[^>]*?)src="[^"]*"', "`${1}src=`"$imgRel`"")
            $body = [regex]::Replace($body, 'data-src="[^"]*"', "data-src=`"$imgRel`"")
        }
        $content = $content.Remove($m.Index, $m.Length).Insert($m.Index, $m.Groups[1].Value + $body + $m.Groups[4].Value)
    }
    if ($content -ne $orig) {
        [IO.File]::WriteAllText($file.FullName, $content, [Text.UTF8Encoding]::new($false))
        $fixed++
        Write-Host "Fixed: $($file.FullName.Replace($root,'').TrimStart('\'))"
    }
}
Write-Host "Total: $fixed files"
