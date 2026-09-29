$root = [System.IO.Path]::GetFullPath($PSScriptRoot)
$rootPrefix = $root.TrimEnd([System.IO.Path]::DirectorySeparatorChar) + [System.IO.Path]::DirectorySeparatorChar
$pidFile = Join-Path $root ".server.pid"
$listener = [System.Net.HttpListener]::new()
$listener.Prefixes.Add("http://localhost:8765/")
$listener.Start()
[System.IO.File]::WriteAllText($pidFile, [string]$PID)

try {
    while ($listener.IsListening) {
        $context = $listener.GetContext()
        try {
            $relativePath = [System.Uri]::UnescapeDataString($context.Request.Url.AbsolutePath.TrimStart('/'))
            if ([string]::IsNullOrWhiteSpace($relativePath)) {
                $relativePath = 'index.html'
            }
            $filePath = [System.IO.Path]::GetFullPath((Join-Path $root $relativePath))
            if (!$filePath.StartsWith($rootPrefix, [System.StringComparison]::OrdinalIgnoreCase) -or !(Test-Path -LiteralPath $filePath -PathType Leaf)) {
                $context.Response.StatusCode = 404
            } else {
                $extension = [System.IO.Path]::GetExtension($filePath).ToLowerInvariant()
                $context.Response.ContentType = switch ($extension) {
                    '.html' { 'text/html; charset=utf-8' }
                    '.css' { 'text/css; charset=utf-8' }
                    '.js' { 'text/javascript; charset=utf-8' }
                    default { 'application/octet-stream' }
                }
                $bytes = [System.IO.File]::ReadAllBytes($filePath)
                $context.Response.ContentLength64 = $bytes.Length
                $context.Response.OutputStream.Write($bytes, 0, $bytes.Length)
            }
        } finally {
            $context.Response.Close()
        }
    }
} finally {
    $listener.Stop()
    if (Test-Path -LiteralPath $pidFile) {
        Remove-Item -LiteralPath $pidFile -Force
    }
}