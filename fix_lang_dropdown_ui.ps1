$ErrorActionPreference = 'Stop'
$root = (Resolve-Path $PSScriptRoot).Path

function Get-RelativeHref([string]$fromFile, [string]$targetRel) {
    $fromDir = [IO.Path]::GetDirectoryName($fromFile)
    $targetFull = [IO.Path]::Combine($root, ($targetRel -replace '/', [IO.Path]::DirectorySeparatorChar))
    $fromUri = New-Object System.Uri ($(if ($fromDir.EndsWith('\')) { $fromDir } else { "$fromDir\" }))
    $toUri = New-Object System.Uri $targetFull
    return $fromUri.MakeRelativeUri($toUri).ToString()
}

$cssInjected = 0
$jsUpdated = 0

$files = Get-ChildItem $root -Recurse -Filter '*.html' -File |
    Where-Object { $_.FullName -notmatch '\\wp-content\\uploads\\' }

foreach ($file in $files) {
    $html = [IO.File]::ReadAllText($file.FullName)
    if ($html -notmatch 'ct-language-switcher') { continue }

    $orig = $html
    $cssHref = Get-RelativeHref $file.FullName 'assets/local-lang-switcher.css'
    $jsHref = Get-RelativeHref $file.FullName 'assets/local-lang-switcher.js'

    if ($html -notmatch 'local-lang-switcher\.css') {
        $linkTag = '<link rel="stylesheet" href="' + $cssHref + '" id="npackpm-lang-switcher-css">' + "`n"
        if ($html -match '</head>') {
            $html = [regex]::Replace($html, '</head>', ($linkTag + '</head>'), 1)
        } else {
            $html = $linkTag + $html
        }
        $cssInjected++
    }

    if ($html -match 'local-lang-switcher\.js') {
        $html = [regex]::Replace($html, 'src="[^"]*local-lang-switcher\.js"', ('src="' + $jsHref + '"'))
        if ($html -ne $orig) { $jsUpdated++ }
    } elseif ($html -match '</body>') {
        $inj = '<script src="' + $jsHref + '"></script>' + "`n"
        $html = [regex]::Replace($html, '</body>', ($inj + '</body>'), 1)
        $jsUpdated++
    }

    if ($html -ne $orig) {
        [IO.File]::WriteAllText($file.FullName, $html, [Text.UTF8Encoding]::new($false))
    }
}

Write-Host "CSS link injected/verified: $cssInjected files"
Write-Host "JS path updated/added: $jsUpdated files"
Write-Host "Done."
