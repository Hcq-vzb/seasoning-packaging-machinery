$Root = $PSScriptRoot
Get-ChildItem -Path $Root -Recurse -File | Where-Object { $_.Extension -match '^\.html?$' } | ForEach-Object {
    $t = [IO.File]::ReadAllText($_.FullName)
    $rel = $_.FullName.Substring($Root.Length).TrimStart('\').Replace('\','/')
    $dir = Split-Path $rel -Parent
    $depth = if ($dir) { ($dir -split '/').Count } else { 0 }
    $p = '../' * ($depth + 1)
    $n = $t
    $n = $n.Replace("id='ct-page-title-styles-css' href='$($p)wp-content/uploads/2025/10/npack.png.webp'", "id='ct-page-title-styles-css' href='$($p)wp-content/themes/blocksy/static/bundle/page-title.min0805.css?ver=2.1.42'")
    $n = $n.Replace("id=`"ct-page-title-styles-css`" href=`"$($p)wp-content/uploads/2025/10/npack.png.webp`"", "id=`"ct-page-title-styles-css`" href=`"$($p)wp-content/themes/blocksy/static/bundle/page-title.min0805.css?ver=2.1.42`"")
    $n = $n.Replace("id='ct-sidebar-styles-css' href='$($p)wp-content/uploads/2025/10/npack.png.webp'", "id='ct-sidebar-styles-css' href='$($p)wp-content/themes/blocksy/static/bundle/sidebar.min0805.css?ver=2.1.42'")
    $n = $n.Replace("id=`"ct-sidebar-styles-css`" href=`"$($p)wp-content/uploads/2025/10/npack.png.webp`"", "id=`"ct-sidebar-styles-css`" href=`"$($p)wp-content/themes/blocksy/static/bundle/sidebar.min0805.css?ver=2.1.42`"")
    if ($n -ne $t) { [IO.File]::WriteAllText($_.FullName, $n) }
}
Write-Host 'done'
