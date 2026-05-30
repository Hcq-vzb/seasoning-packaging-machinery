$root = $PSScriptRoot
$f = Get-ChildItem -Path $root -Recurse -File | Where-Object { $_.Name -eq '2-2.html' -and $_.FullName -match '页码' } | Select-Object -First 1
Write-Host "File: $($f.FullName)"
$dir = [IO.Path]::GetDirectoryName($f.FullName)
$parent = Split-Path $dir -Parent
$grandparent = Split-Path $parent -Parent
$name = Split-Path $parent -Leaf
Write-Host "Parent: $parent"
Write-Host "Grandparent: $grandparent"
Write-Host "Name: $name"
$c1 = Join-Path $grandparent ($name + '.html')
$c2 = Join-Path $parent 'index.html'
Write-Host "Candidate1: $c1 exists=$(Test-Path -LiteralPath $c1)"
Write-Host "Candidate2: $c2 exists=$(Test-Path -LiteralPath $c2)"
$fromDir = $dir + [IO.Path]::DirectorySeparatorChar
if (Test-Path -LiteralPath $c1) {
    $rel = (New-Object Uri($fromDir)).MakeRelativeUri((New-Object Uri($c1))).ToString()
    Write-Host "Rel page1: $rel"
}
$content = [IO.File]::ReadAllText($f.FullName)
if ($content -match '<nav class="ct-pagination"[^>]*>[\s\S]*?</nav>') {
    Write-Host "Current nav hrefs:"
    [regex]::Matches($Matches[0], 'href="([^"]+)"') | ForEach-Object { Write-Host "  $($_.Groups[1].Value)" }
}
