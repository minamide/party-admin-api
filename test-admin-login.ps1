# テストスクリプト: 管理者ログインと isAdmin フラグの確認
$API_BASE = "http://127.0.0.1:8787"

Write-Host "=== 管理者ログインテスト ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. admin@example.com でログイン"

$body = @{
    email = "admin@example.com"
    password = "AdminPass123"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$API_BASE/auth/sign-in" `
        -Method POST `
        -Headers @{"Content-Type"="application/json"} `
        -Body $body

    Write-Host "レスポンス:"
    $response | ConvertTo-Json -Depth 10

    $token = $response.data.token
    $isAdmin = $response.data.user.isAdmin

    Write-Host ""
    Write-Host "抽出された情報:"
    Write-Host "  Token: $($token.Substring(0, [Math]::Min(20, $token.Length)))..."
    Write-Host "  isAdmin: $isAdmin"

    if ($isAdmin -eq $true) {
        Write-Host "  ✅ isAdmin フラグが正しく返されています" -ForegroundColor Green
    } else {
        Write-Host "  ❌ isAdmin フラグが false または null です" -ForegroundColor Red
    }

    Write-Host ""
    Write-Host "2. /auth/me で現在のユーザー情報を取得"
    
    $meResponse = Invoke-RestMethod -Uri "$API_BASE/auth/me" `
        -Method GET `
        -Headers @{
            "Authorization" = "Bearer $token"
        }

    Write-Host "レスポンス:"
    $meResponse | ConvertTo-Json -Depth 10

    $meIsAdmin = $meResponse.data.isAdmin
    Write-Host ""
    Write-Host "  isAdmin: $meIsAdmin"

    if ($meIsAdmin -eq $true) {
        Write-Host "  ✅ /auth/me でも isAdmin フラグが正しく返されています" -ForegroundColor Green
    } else {
        Write-Host "  ❌ /auth/me の isAdmin フラグが false または null です" -ForegroundColor Red
    }

} catch {
    Write-Host "エラーが発生しました:" -ForegroundColor Red
    Write-Host $_.Exception.Message
    Write-Host $_.Exception.Response
}

Write-Host ""
Write-Host "=== テスト完了 ===" -ForegroundColor Cyan
