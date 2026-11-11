# Petit serveur local pour le banc de test : http://localhost:8765/
# Sert les fichiers du dépôt ; toute autre URL renvoie test/harness.html (fausse actualisation).
param([int]$Port = 8765)

$root = Split-Path $PSScriptRoot -Parent
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$Port/")
$listener.Start()
Write-Host "Banc de test sur http://localhost:$Port/"

$types = @{ '.js' = 'text/javascript'; '.css' = 'text/css'; '.png' = 'image/png'; '.html' = 'text/html' }
while ($listener.IsListening) {
    $ctx = $listener.GetContext()
    $rel = [Uri]::UnescapeDataString($ctx.Request.Url.AbsolutePath).TrimStart('/')
    $file = Join-Path $root $rel
    if (-not $rel -or -not (Test-Path $file -PathType Leaf)) { $file = Join-Path $root 'test\harness.html' }
    $ext = [IO.Path]::GetExtension($file)
    $ctx.Response.ContentType = if ($types[$ext]) { "$($types[$ext]); charset=utf-8" } else { 'application/octet-stream' }
    $bytes = [IO.File]::ReadAllBytes($file)
    $ctx.Response.OutputStream.Write($bytes, 0, $bytes.Length)
    $ctx.Response.Close()
}
