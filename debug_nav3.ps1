$root = $PSScriptRoot
$htmlFiles = Get-ChildItem -Path $root -Recurse -File | Where-Object { $_.Extension -match '\.html?$' }
$f = $htmlFiles | Where-Object { $_.FullName -like '*页码*2-2.html' } | Select-Object -First 1
Write-Host "Pagination file: $($f.FullName)"
$c = [IO.File]::ReadAllText($f.FullName)
$mirroredRx = [regex]'Mirrored from www\.npackpm\.com/([^ ]+)'
$mm = $mirroredRx.Match($c)
$url = $mm.Groups[1].Value
Write-Host "Mirrored: $url"
$path = [Uri]::UnescapeDataString($url).TrimEnd('/')
if ($path -match '/(\d+)$') { $path = $path.Substring(0, $path.LastIndexOf('/')) }
if ($path -match '/(page|pagina|strona|seite|\u9875\u7801|\u0441\u0442\u0440\u0430\u043d\u0438\u0446\u0430)$') {
    $path = $path.Substring(0, $path.LastIndexOf('/'))
}
Write-Host "Base path: $path"
$hits = @()
foreach ($hf in $htmlFiles) {
    $hc = [IO.File]::ReadAllText($hf.FullName)
    if ($hc -match 'Mirrored from www\.npackpm\.com/([^ \?#]+)') {
        $m = [Uri]::UnescapeDataString($Matches[1]).TrimEnd('/')
        if ($m -eq $path) { $hits += $hf }
    }
}
Write-Host "Hits: $($hits.Count)"
foreach ($h in $hits) {
    Write-Host "  $($h.FullName) dir=$(Split-Path $h.FullName -Parent) base=$($h.BaseName)"
}
$parts = $path -split '/'
$wantDir = Join-Path $root $parts[0]
$wantBase = $parts[-1]
Write-Host "Want dir: $wantDir"
Write-Host "Want base: $wantBase"
$preferred = $hits | Where-Object { $_.DirectoryName -eq $wantDir -and $_.BaseName -eq $wantBase }
Write-Host "Preferred count: $(@($preferred).Count)"
if ($preferred) {
    $fromDir = [IO.Path]::GetDirectoryName($f.FullName) + [IO.Path]::DirectorySeparatorChar
    $rel = (New-Object Uri($fromDir)).MakeRelativeUri((New-Object Uri($preferred[0].FullName))).ToString()
    Write-Host "Page1 rel: $rel"
}
