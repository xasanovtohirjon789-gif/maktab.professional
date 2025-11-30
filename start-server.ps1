# Simple HTTP Server using PowerShell
$port = 8000
$path = (Get-Location).Path

$http = [System.Net.HttpListener]::new()
$http.Prefixes.Add("http://localhost:$port/")
$http.Start()

Write-Host "Server starting on http://localhost:$port"
Write-Host "Serving files from: $path"
Write-Host "Press Ctrl+C to stop"

while ($http.IsListening) {
    $context = $http.GetContext()
    $request = $context.Request
    $response = $context.Response
    
    $url = $request.Url.LocalPath
    if ($url -eq '/') { $url = '/index.html' }
    
    $filePath = Join-Path $path $url
    $filePath = [System.IO.Path]::GetFullPath($filePath)
    
    # Security check - prevent path traversal
    if (-not $filePath.StartsWith($path)) {
        $response.StatusCode = 403
        $response.Close()
        continue
    }
    
    if ([System.IO.File]::Exists($filePath)) {
        try {
            $bytes = [System.IO.File]::ReadAllBytes($filePath)
            $ext = [System.IO.Path]::GetExtension($filePath)
            
            $mimeTypes = @{
                '.html' = 'text/html'
                '.js'   = 'application/javascript'
                '.css'  = 'text/css'
                '.json' = 'application/json'
                '.png'  = 'image/png'
                '.jpg'  = 'image/jpeg'
                '.jpeg' = 'image/jpeg'
                '.svg'  = 'image/svg+xml'
            }
            
            $mimeType = $mimeTypes[$ext]
            if (-not $mimeType) { $mimeType = 'application/octet-stream' }
            
            $response.ContentType = $mimeType
            $response.ContentLength64 = $bytes.Length
            $response.OutputStream.Write($bytes, 0, $bytes.Length)
        }
        catch {
            $response.StatusCode = 500
        }
    }
    else {
        $response.StatusCode = 404
    }
    
    $response.Close()
}

$http.Stop()
