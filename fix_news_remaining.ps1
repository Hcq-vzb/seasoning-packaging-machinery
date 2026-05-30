# Phase 2: missing articles, post-id map, JS sanitization, head/misc links
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

function Get-RelativeHref([string]$fromFile, [string]$targetRel) {
    $fromDir = [IO.Path]::GetDirectoryName($fromFile)
    if (-not $fromDir) { $fromDir = $root }
    $targetFull = [IO.Path]::GetFullPath([IO.Path]::Combine($root, ($targetRel -replace '/', [IO.Path]::DirectorySeparatorChar)))
    $fromFull = [IO.Path]::GetFullPath($(if ($fromDir.EndsWith('\')) { $fromDir } else { "$fromDir\" }))
    $fromUri = New-Object System.Uri $fromFull
    $toUri = New-Object System.Uri $targetFull
    return $fromUri.MakeRelativeUri($toUri).ToString()
}

function Normalize-RootPath([string]$Path) {
    $p = ($Path -replace '\\', '/') -replace '^(\.\./)+', '' -replace '^https?:\\?/\\?/[^/]+/', '' -replace '^//[^/]+/', ''
    return $p.TrimStart('/')
}

function Rewrite-NewArticlePages {
    $newFiles = $manualPostMap.Values | Select-Object -Unique
    foreach ($rel in $newFiles) {
        $full = Join-Path $root $rel
        if (-not (Test-Path $full)) { continue }
        $c = [IO.File]::ReadAllText($full)
        $orig = $c
        $c = $c -replace 'https?://www\.npackpm\.com/', ''
        $c = $c -replace 'https?:\\?/\\?/www\.npackpm\.com\\?/', ''
        $c = $c -replace '(src|href)="//www\.npackpm\.com/', '${1}="'
        if ($c -match '<base\s') { $c = [regex]::Replace($c, '<base\s+href="[^"]*"\s*/?>\s*', '') }
        if ($c -ne $orig) {
            [IO.File]::WriteAllText($full, $c, [Text.UTF8Encoding]::new($false))
            Write-Host "Rewrote paths: $rel"
        }
    }
}

function Fix-EntryCardByPostId([string]$content, [string]$file) {
    $rx = [regex]'(<article class="entry-card[^"]* post-(\d+)[^>]*>)([\s\S]*?)(</article>)'
    $matches = @($rx.Matches($content))
    for ($i = $matches.Count - 1; $i -ge 0; $i--) {
        $m = $matches[$i]
        if (-not $m.Success -or $m.Groups.Count -lt 3) { continue }
        $postId = $m.Groups[2].Value
        if (-not $manualPostMap.ContainsKey($postId)) { continue }
        $slug = $manualPostMap[$postId]
        $target = Join-Path $root $slug
        if (-not (Test-Path $target)) { continue }
        $hrefRel = Get-RelativeHref $file $slug
        $body = $m.Groups[3].Value
        $detail = [IO.File]::ReadAllText($target)
        $img = $null
        if ($detail -match 'wp-post-image"[^>]*src="([^"]+)"') { $img = Normalize-RootPath $Matches[1] }
        elseif ($detail -match 'og:image" content="([^"]+)"') { $img = Normalize-RootPath $Matches[1] }
        $nb = [regex]::Replace($body, '(ct-media-container[^>]*href=")[^"]+(")', "`${1}$hrefRel`${2}")
        $nb = [regex]::Replace($nb, '(class="entry-title"[^>]*>\s*<a href=")[^"]+(")', "`${1}$hrefRel`${2}")
        if ($img) {
            $imgRel = Get-RelativeHref $file $img
            $nb = [regex]::Replace($nb, '(wp-post-image"[^>]*?)src="[^"]*"', "`${1}src=`"$imgRel`"")
            $nb = [regex]::Replace($nb, 'src="index\.html"([^>]*class="[^"]*wp-post-image)', "src=`"$imgRel`"`${1}")
        }
        if ($nb -ne $body) {
            $content = $content.Remove($m.Index, $m.Length).Insert($m.Index, $m.Groups[1].Value + $nb + $m.Groups[4].Value)
        }
    }
    return $content
}

function Sanitize-JsUrls([string]$content) {
    $content = $content -replace 'https?:\\?/\\?/www\.npackpm\.com\\?/', ''
    $content = $content -replace 'https?://www\.npackpm\.com/', ''
    $content = [regex]::Replace($content, '("ajaxurl":")https?://[^"]+(")', '${1}#${2}')
    $content = [regex]::Replace($content, '("url":")https?://www\.npackpm\.com[^"]*(")', '${1}#${2}')
    $content = [regex]::Replace($content, '<script[^>]*data-name="wpr-wpr-beacon"[^>]*>[\s\S]*?</script>', '')
    return $content
}

Write-Host 'Rewriting newly downloaded article pages...'
Rewrite-NewArticlePages

$newsFiles = @('news.html') +
    (Get-ChildItem (Join-Path $root 'news\page') -Filter '*.html').FullName +
    (Get-ChildItem $root -Recurse -Filter '*.html' | Where-Object {
        $_.FullName -match '\\(nouvelles|nachrichten|noticias|notizie|wiadomosci|новости|新闻)\\'
    }).FullName

$fixed = 0
foreach ($full in $newsFiles) {
    if (-not (Test-Path $full)) { continue }
    $c = [IO.File]::ReadAllText($full)
    $orig = $c
    $c = Fix-EntryCardByPostId $c $full
    $c = Sanitize-JsUrls $c
    $homeRel = Get-RelativeHref $full 'index.html'
    $c = $c -replace '(class="site-logo-container"[^>]*href=")index\.html(")', "`${1}$homeRel`${2}"
    $c = $c -replace '(data-id="offcanvas-logo"[^>]*href=")index\.html(")', "`${1}$homeRel`${2}"
    if ($c -ne $orig) {
        [IO.File]::WriteAllText($full, $c, [Text.UTF8Encoding]::new($false))
        $rel = $full.Replace($root, '').TrimStart('\','/')
        Write-Host "Fixed: $rel"
        $fixed++
    }
}
Write-Host "Done. Files updated: $fixed"
