$root = $PSScriptRoot
$from = Join-Path $root 'zh\产品\页码\2-2.html'
$to1 = Join-Path $root 'zh\产品.html'
$to2 = Join-Path $root 'zh\产品\index.html'
$fromDir = [IO.Path]::GetDirectoryName($from) + [IO.Path]::DirectorySeparatorChar
Write-Host "From: $from"
Write-Host "To1 exists: $(Test-Path $to1) -> $to1"
Write-Host "To2 exists: $(Test-Path $to2) -> $to2"
$rel1 = (New-Object Uri($fromDir)).MakeRelativeUri((New-Object Uri($to1))).ToString()
$rel2 = (New-Object Uri($fromDir)).MakeRelativeUri((New-Object Uri($to2))).ToString()
Write-Host "Rel to 产品.html: $rel1"
Write-Host "Rel to index.html: $rel2"

$content = [IO.File]::ReadAllText($from)
if ($content -match '<nav class="ct-pagination"[^>]*>[\s\S]*?</nav>') {
    Write-Host "Nav found, length: $($Matches[0].Length)"
    Write-Host $Matches[0].Substring(0, [Math]::Min(400, $Matches[0].Length))
}
