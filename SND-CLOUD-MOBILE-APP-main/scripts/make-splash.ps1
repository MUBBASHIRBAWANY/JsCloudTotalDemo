Add-Type -AssemblyName System.Drawing

$w = 1284
$h = 2778
$bmp = New-Object System.Drawing.Bitmap $w, $h
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
$g.Clear([System.Drawing.Color]::FromArgb(255, 49, 46, 129))

$brush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::White)
$font1 = New-Object System.Drawing.Font("Segoe UI", 92, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
$font2 = New-Object System.Drawing.Font("Segoe UI", 58, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
$sf = New-Object System.Drawing.StringFormat
$sf.Alignment = [System.Drawing.StringAlignment]::Center
$sf.LineAlignment = [System.Drawing.StringAlignment]::Center

$y1 = [single](($h / 2) - 90)
$y2 = [single](($h / 2) + 30)
$rw = [single]($w - 96)
$rect1 = New-Object System.Drawing.RectangleF([single]48, $y1, $rw, [single]100)
$rect2 = New-Object System.Drawing.RectangleF([single]48, $y2, $rw, [single]80)
$g.DrawString("Jaffar Son's", $font1, $brush, $rect1, $sf)
$g.DrawString("International", $font2, $brush, $rect2, $sf)

$out = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot "..\assets\images\splash-icon.png"))
$bmp.Save($out, [System.Drawing.Imaging.ImageFormat]::Png)

$g.Dispose()
$bmp.Dispose()
$brush.Dispose()
$font1.Dispose()
$font2.Dispose()
Write-Output "saved $out ${w}x${h}"
