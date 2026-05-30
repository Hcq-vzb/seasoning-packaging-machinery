# Fix remaining news issues: broken images + folder-style detail pages + bad links
$ErrorActionPreference = 'Stop'
$root = (Resolve-Path $PSScriptRoot).Path
$report = @{
    HtmlFoldersFlattened = 0
    LinkPatternFixes = 0
    ImagesFixed = 0
    DetailPagesFixed = 0
    EntryLinksFixed = 0
    FilesModified = 0
}
$log = [System.Collections.Generic.List[string]]::new()

function Write-Log([string]$msg) { $script:log.Add($msg) }

function Normalize-UrlPath([string]$p) {
    if (-not $p) { return '' }
    $p = [System.Uri]::UnescapeDataString($p)
    $p = ($p -replace '\\', '/') -replace '^https?:/+[^/]+/+', '' -replace '^//+[^/]+/+', ''
    $p = $p -replace '^(\.\./)+', ''
    return $p.TrimStart('/')
}

function Get-RelHref([string]$fromFile, [string]$targetRel) {
    $fromDir = [IO.Path]::GetDirectoryName($fromFile)
    if (-not $fromDir) { $fromDir = $root }
    $fromUri = New-Object Uri ([IO.Path]::GetFullPath($fromDir + '\'))
    $targetFull = [IO.Path]::GetFullPath([IO.Path]::Combine($root, ($targetRel -replace '/', '\')))
    $toUri = New-Object Uri $targetFull
    return $fromUri.MakeRelativeUri($toUri).ToString()
}

function Resolve-LocalPath([string]$fromFile, [string]$urlPath) {
    $norm = Normalize-UrlPath $urlPath
    if (-not $norm) { return $null }
    $fromDir = [IO.Path]::GetDirectoryName($fromFile)
    if (-not $fromDir) { $fromDir = $root }
    $candidates = @(
        [IO.Path]::GetFullPath([IO.Path]::Combine($fromDir, $norm.Replace('/', '\')))
        [IO.Path]::GetFullPath([IO.Path]::Combine($root, $norm.Replace('/', '\')))
    )
    foreach ($c in $candidates) {
        if (Test-Path $c -PathType Leaf) { return $c }
    }
    return $null
}

function Get-ImageFromHtml([string]$html) {
    if ($html -match '"image"\s*:\s*\{[^}]*"url"\s*:\s*"((?:[^"\\]|\\.)+)"') {
        return (Normalize-UrlPath ($Matches[1] -replace '\\/', '/'))
    }
    if ($html -match 'property="og:image"\s+content="([^"]+)"') {
        return (Normalize-UrlPath $Matches[1])
    }
    if ($html -match 'wp-block-image[^>]*>[\s\S]*?<img[^>]+src="([^"]+)"') {
        return (Normalize-UrlPath $Matches[1])
    }
    if ($html -match 'wp-post-image"[^>]*src="([^"]+)"') {
        return (Normalize-UrlPath $Matches[1])
    }
    return $null
}

function Get-ImageFromTitle([string]$tag) {
    if ($tag -match 'title="([0-9]{14,})') {
        $id = $Matches[1]
        $cand = "wp-content/uploads/2025/10/$id.webp"
        if (Test-Path (Join-Path $root ($cand -replace '/', '\'))) { return $cand }
        $cand2 = "wp-content/uploads/2025/12/$id.webp"
        if (Test-Path (Join-Path $root ($cand2 -replace '/', '\'))) { return $cand2 }
    }
    return $null
}

function Fix-BadIndexInDetailPage([string]$content, [string]$filePath) {
    $imgPath = Get-ImageFromHtml $content
    if (-not $imgPath) { return $content }
    $imgRel = Get-RelHref $filePath $imgPath
    $orig = $content
    # preload / hero broken
    $content = [regex]::Replace($content, '(rel="preload"[^>]*href=")index\.html(")', "`${1}$imgRel`${2}")
    $content = [regex]::Replace($content, '(class="[^"]*wp-post-image"[^>]*?)src="index\.html"', "`${1}src=`"$imgRel`"")
    $content = [regex]::Replace($content, 'src="index\.html"([^>]*class="[^"]*wp-post-image)', "src=`"$imgRel`"`${1}")
    $content = [regex]::Replace($content, '(class="wp-block-image[^"]*"[^>]*>[\s\S]*?<img[^>]*?)src="index\.html"', "`${1}src=`"$imgRel`"")
    $content = [regex]::Replace($content, 'src="index\.html"([^>]*class="wp-image-)', "src=`"$imgRel`"`${1}")
    if ($content -ne $orig) { $script:report.DetailPagesFixed++ }
    return $content
}

function Sync-LazyAttrs([string]$tag, [string]$goodSrc) {
    $t = $tag
    foreach ($attr in @('data-src', 'data-lazy-src', 'data-original', 'data-lazy')) {
        if ($t -match ($attr + '="[^"]*"')) {
            $t = [regex]::Replace($t, $attr + '="[^"]*"', ($attr + '="' + $goodSrc + '"'))
        } else {
            $t = $t -replace '<img', ('<img ' + $attr + '="' + $goodSrc + '"')
        }
    }
    if ($t -match 'srcset="[^"]*"') {
        $t = [regex]::Replace($t, 'srcset="[^"]*"', ('srcset="' + $goodSrc + '"'))
    }
    return $t
}

# --- Phase A: Flatten .html folders ---
Write-Host 'Phase A: Flatten .html folders...'
Get-ChildItem $root -Recurse -Directory | Where-Object { $_.Name -match '\.html$' } | ForEach-Object {
    $idx = Join-Path $_.FullName 'index.html'
    if (-not (Test-Path $idx)) { return }
    $parent = $_.Parent.FullName
    $flat = Join-Path $parent $_.Name
    $txt = Join-Path $parent ($_.Name + '.txt')
    if (Test-Path $flat -PathType Leaf) {
        Remove-Item $_.FullName -Recurse -Force
        $script:report.HtmlFoldersFlattened++
        Write-Log "Removed duplicate folder (flat exists): $($_.Name)"
        return
    }
    if (Test-Path $txt) {
        Copy-Item $txt $flat -Force
        Remove-Item $_.FullName -Recurse -Force
    } else {
        Move-Item $idx $flat -Force
        Remove-Item $_.FullName -Recurse -Force
    }
    $script:report.HtmlFoldersFlattened++
    Write-Log "Flattened: $($_.FullName.Substring($root.Length))"
}

# --- Phase B: Global link pattern fix ---
Write-Host 'Phase B: Fix .html/index.html link patterns...'
$linkPatterns = @('.html/index.html', '-html/index.html', '.html/"', ".html/'", '-html/"', "-html/'")
Get-ChildItem $root -Recurse -Include '*.html','*.js' -File |
    Where-Object { $_.FullName -notmatch '\\wp-content\\uploads\\' } | ForEach-Object {
        $text = [IO.File]::ReadAllText($_.FullName)
        $before = $text
        $text = $text.Replace('.html/index.html', '.html')
        $text = $text.Replace('-html/index.html', '-html.html')
        $text = $text.Replace('.html/"', '.html"')
        $text = $text.Replace(".html/'", ".html'")
        $text = $text.Replace('-html/"', '-html.html"')
        $text = $text.Replace("-html/'", "-html.html'")
        if ($text -ne $before) {
            [IO.File]::WriteAllText($_.FullName, $text, [Text.UTF8Encoding]::new($false))
            $script:report.LinkPatternFixes++
        }
    }

function Test-BadIndexHref([string]$href) {
    if (-not $href) { return $true }
    return ($href -match '(^|[\\/])\.\.([\\/]\.\.)*[\\/]index\.html$') -or ($href -eq 'index.html')
}

# --- Phase C: Build post-id -> EN article map from all EN list pages ---
Write-Host 'Phase C: Build post-id index...'
$postMap = @{}
$manualPostMap = @{
    '3710' = 'what-are-capsules-and-how-to-fill-capsules.html'
    '3703' = 'what-are-the-advantages-of-automatic-filling-machine.html'
    '3694' = 'bee-pollen.html'
    '3653' = 'shampoo-production-processing-equipments.html'
    '3639' = 'how-to-choose-a-liquid-filling-machine.html'
    '3633' = 'how-to-choose-an-edible-oil-filling-machine.html'
    '3615' = 'analysis-of-corrosion-reasons-and-anti-corrosion-methods-for-chemical-production-equipment.html'
}
foreach ($k in $manualPostMap.Keys) { $postMap[$k] = $manualPostMap[$k] }

function Add-PostMapFromList([string]$listPath) {
    if (-not (Test-Path $listPath)) { return }
    $c = [IO.File]::ReadAllText($listPath)
    $rx = [regex]'(<article class="entry-card[^"]* post-(\d+)[^>]*>)([\s\S]*?)(</article>)'
    foreach ($m in $rx.Matches($c)) {
        $postIdKey = $m.Groups[2].Value
        if ($postMap.ContainsKey($postIdKey)) { continue }
        $body = $m.Groups[3].Value
        $href = $null
        $hm = [regex]::Match($body, 'ct-media-container[^>]*href="([^"]+\.html)"')
        if ($hm.Success) { $href = $hm.Groups[1].Value }
        if (-not $href) {
            $hm = [regex]::Match($body, 'class="entry-title"[^>]*>\s*<a href="([^"]+\.html)"')
            if ($hm.Success) { $href = $hm.Groups[1].Value }
        }
        if (-not $href) { continue }
        $norm = Normalize-UrlPath $href
        if (Test-BadIndexHref $norm) { continue }
        $fullArticle = Join-Path $root ($norm -replace '/', '\')
        if (Test-Path $fullArticle -PathType Leaf) {
            $postMap[$postIdKey] = $norm
        }
    }
}

Add-PostMapFromList (Join-Path $root 'news.html')
Get-ChildItem (Join-Path $root 'news\page') -Filter '*.html' -ErrorAction SilentlyContinue | ForEach-Object {
    Add-PostMapFromList $_.FullName
}
Add-PostMapFromList (Join-Path $root 'technology.html')
Get-ChildItem (Join-Path $root 'technology\page') -Filter '*.html' -ErrorAction SilentlyContinue | ForEach-Object {
    Add-PostMapFromList $_.FullName
}
Write-Host "  post-id map: $($postMap.Count) entries"

# --- Phase D: Collect news-related files ---
$newsFiles = [System.Collections.Generic.HashSet[string]]::new()
@('news.html', 'firm-news.html', 'industry-news.html') | ForEach-Object {
    $p = Join-Path $root $_
    if (Test-Path $p) { [void]$newsFiles.Add($p) }
}
Get-ChildItem (Join-Path $root 'news\page') -Filter '*.html' -ErrorAction SilentlyContinue | ForEach-Object { [void]$newsFiles.Add($_.FullName) }
@('technology.html', 'exhibitions.html') | ForEach-Object {
    $p = Join-Path $root $_
    if (Test-Path $p) { [void]$newsFiles.Add($p) }
}
Get-ChildItem (Join-Path $root 'technology\page') -Filter '*.html' -ErrorAction SilentlyContinue | ForEach-Object { [void]$newsFiles.Add($_.FullName) }
Get-ChildItem $root -Recurse -Filter '*.html' -File | Where-Object {
    $_.FullName -match 'nouvelles[\\/]page|nachrichten[\\/]seite|noticias[\\/]pagina|notizie[\\/]pagina|wiadomosci[\\/]strona|новости[\\/]|新闻[\\/]页码|technologie[\\/]page|technologie[\\/]seite|tecnologia[\\/]pagina|technologia[\\/]strona|技术[\\/]页码'
} | ForEach-Object { [void]$newsFiles.Add($_.FullName) }

# All EN detail pages linked from lists
$detailFiles = [System.Collections.Generic.HashSet[string]]::new()
foreach ($f in $newsFiles) {
    $html = [IO.File]::ReadAllText($f)
    foreach ($m in [regex]::Matches($html, 'entry-card[\s\S]*?href="([^"]+\.html)"')) {
        $rel = Normalize-UrlPath $m.Groups[1].Value
        $full = Join-Path $root ($rel -replace '/', '\')
        if (Test-Path $full -PathType Leaf) { [void]$detailFiles.Add($full) }
    }
}
foreach ($v in $postMap.Values) {
    $full = Join-Path $root ($v -replace '/', '\')
    if (Test-Path $full) { [void]$detailFiles.Add($full) }
}

# --- Phase E: Fix detail pages ---
Write-Host "Phase E: Fix $($detailFiles.Count) detail pages..."
foreach ($full in $detailFiles) {
    $content = [IO.File]::ReadAllText($full)
    $orig = $content
    $content = Fix-BadIndexInDetailPage $content $full
    $content = $content -replace 'https?://www\.npackpm\.com/', ''
    $content = $content -replace 'https?:\\?/\\?/www\.npackpm\.com\\?/', ''
    if ($content -ne $orig) {
        [IO.File]::WriteAllText($full, $content, [Text.UTF8Encoding]::new($false))
        $script:report.FilesModified++
    }
}

# --- Phase F: Fix news list pages (entry cards + images) ---
Write-Host "Phase F: Fix $($newsFiles.Count) news list pages..."
foreach ($full in $newsFiles) {
    $content = [IO.File]::ReadAllText($full)
    $orig = $content

    # entry-card blocks
    $rx = [regex]'(<article class="entry-card[^"]* post-(\d+)[^>]*>)([\s\S]*?)(</article>)'
    $ms = @($rx.Matches($content))
    for ($i = $ms.Count - 1; $i -ge 0; $i--) {
        $m = $ms[$i]
        $postId = $m.Groups[2].Value
        $body = $m.Groups[3].Value
        $enSlug = $null
        if ($postMap.ContainsKey($postId)) { $enSlug = $postMap[$postId] }

        # resolve article href for this lang: use existing if valid, else EN
        $hrefM = [regex]::Match($body, 'ct-media-container[^>]*href="([^"]+)"')
        $articleRel = $null
        if ($hrefM.Success) {
            $h = $hrefM.Groups[1].Value
            if (-not (Test-BadIndexHref $h) -and (Resolve-LocalPath $full $h)) {
                $articleRel = Normalize-UrlPath $h
            }
        }
        if (-not $articleRel -and $enSlug) { $articleRel = $enSlug }

        if ($articleRel) {
            $hrefRel = Get-RelHref $full $articleRel
            $nb = [regex]::Replace($body, '(ct-media-container[^>]*href=")[^"]+(")', "`${1}$hrefRel`${2}")
            $nb2 = [regex]::Replace($nb, '(class="entry-title"[^>]*>\s*<a href=")[^"]+(")', "`${1}$hrefRel`${2}")
            if ($nb2 -ne $body) { $script:report.EntryLinksFixed++; $body = $nb2 }
        }

        $imgRel = $null
        if ($articleRel) {
            $detailPath = Join-Path $root ($articleRel -replace '/', '\')
            if (Test-Path $detailPath) {
                $img = Get-ImageFromHtml ([IO.File]::ReadAllText($detailPath))
                if ($img) { $imgRel = Get-RelHref $full $img }
            }
        }
        if (-not $imgRel) {
            $imgTagM = [regex]::Match($body, '<img[^>]+class="[^"]*wp-post-image[^"]*"[^>]*>')
            if (-not $imgTagM.Success) { $imgTagM = [regex]::Match($body, '<img[^>]+wp-post-image[^>]*>') }
            if ($imgTagM.Success) {
                $imgFromTitle = Get-ImageFromTitle $imgTagM.Value
                if ($imgFromTitle) { $imgRel = Get-RelHref $full $imgFromTitle }
            }
        }
        if ($imgRel) {
            $nb = [regex]::Replace($body, '(<img[^>]*?class="[^"]*wp-post-image[^"]*"[^>]*?)src="[^"]*"', "`${1}src=`"$imgRel`"")
            if ($nb -eq $body) {
                $nb = [regex]::Replace($body, 'src="(?:\.\./)*(?:index\.html)"([^>]*wp-post-image)', "src=`"$imgRel`"`${1}")
            }
            if ($nb -ne $body) { $script:report.ImagesFixed++; $body = $nb }
        }

        if ($body -ne $m.Groups[3].Value) {
            $content = $content.Remove($m.Index, $m.Length).Insert($m.Index, $m.Groups[1].Value + $body + $m.Groups[4].Value)
        }
    }

    # background-image in inline styles
    $content = [regex]::Replace($content, 'background-image:\s*url\(\s*["'']?(?:https?://[^)"'']+|index\.html)["'']?\s*\)', {
        param($bm)
        return $bm.Value
    })
    $content = [regex]::Replace($content, 'background-image:\s*url\(\s*["'']?(https?://www\.npackpm\.com/)?([^)"'']+)["'']?\s*\)', {
        param($bm)
        $p = Normalize-UrlPath $bm.Groups[2].Value
        $rel = Get-RelHref $full $p
        if (Resolve-LocalPath $full $p) { $script:report.ImagesFixed++; return "background-image:url('$rel')" }
        return $bm.Value
    })

    # news/page head: logo/rss/api links wrongly set to index.html
    if ($full -match '[\\/]news[\\/]page[\\/]') {
        $homeRel = Get-RelHref $full 'index.html'
        $captchaIcon = Get-RelHref $full 'wp-content/plugins/captcha-for-contact-form-7/core/assets/reload-icon.png'
        $content = $content -replace '(<link rel="alternate"[^>]*href=")index\.html(")', "`${1}$homeRel`${2}"
        $content = $content -replace '(<link rel="https://api\.w\.org/" href=")index\.html(")', "`${1}$homeRel`${2}"
        $content = $content -replace '(class="site-logo-container"[^>]*href=")index\.html(")', "`${1}$homeRel`${2}"
        $content = $content -replace '(data-id="offcanvas-logo"[^>]*href=")index\.html(")', "`${1}$homeRel`${2}"
        $content = $content -replace '(class="cf7 captcha-reload"[^>]*>[\s\S]*?<img[^>]*src=")index\.html(")', "`${1}$captchaIcon`${2}"
    }

    if ($content -ne $orig) {
        [IO.File]::WriteAllText($full, $content, [Text.UTF8Encoding]::new($false))
        $script:report.FilesModified++
    }
}

# --- Phase G: Verification scan ---
Write-Host 'Phase G: Verification...'
$verifyImg = 0
$verifyLink = 0
foreach ($full in $newsFiles) {
    $c = [IO.File]::ReadAllText($full)
    foreach ($m in [regex]::Matches($c, 'entry-card[\s\S]*?wp-post-image[^>]*src="([^"]+)"')) {
        $src = $m.Groups[1].Value
        if ((Test-BadIndexHref $src) -or -not (Resolve-LocalPath $full $src)) { $verifyImg++ }
    }
    foreach ($m in [regex]::Matches($c, 'entry-card[\s\S]*?ct-media-container[^>]*href="([^"]+)"')) {
        $h = $m.Groups[1].Value
        if (Test-BadIndexHref $h) { $verifyLink++; continue }
        $resolved = Resolve-LocalPath $full $h
        if (-not $resolved) { $verifyLink++ }
        elseif (Test-Path $resolved -PathType Container) { $verifyLink++ }
    }
}

$out = @"
新闻页面最终修复报告
====================
.html 文件夹扁平化: $($report.HtmlFoldersFlattened)
全局链接模式修正文件数: $($report.LinkPatternFixes)
修改的文件总数: $($report.FilesModified)
详情页内 index.html 图片修复: $($report.DetailPagesFixed)
列表项链接修复: $($report.EntryLinksFixed)
列表项封面图修复: $($report.ImagesFixed)

验证（应为 0）:
  列表封面仍异常: $verifyImg
  列表链接仍异常: $verifyLink

详细日志:
$($log -join "`n")
"@
$out | Out-File (Join-Path $root 'fix_news_final_report.txt') -Encoding utf8
Write-Host $out
