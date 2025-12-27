#!/bin/bash
# テストスクリプト: 管理者ログインと isAdmin フラグの確認

API_BASE="http://127.0.0.1:8787"

echo "=== 管理者ログインテスト ==="
echo ""
echo "1. admin@example.com でログイン"
RESPONSE=$(curl -s -X POST "$API_BASE/auth/sign-in" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "AdminPass123"
  }')

echo "レスポンス:"
echo "$RESPONSE" | jq '.'

# トークンを抽出
TOKEN=$(echo "$RESPONSE" | jq -r '.data.token')
IS_ADMIN=$(echo "$RESPONSE" | jq -r '.data.user.isAdmin')

echo ""
echo "抽出された情報:"
echo "  Token: ${TOKEN:0:20}..."
echo "  isAdmin: $IS_ADMIN"

if [ "$IS_ADMIN" == "true" ]; then
  echo "  ✅ isAdmin フラグが正しく返されています"
else
  echo "  ❌ isAdmin フラグが false または null です"
fi

echo ""
echo "2. /auth/me で現在のユーザー情報を取得"
ME_RESPONSE=$(curl -s -X GET "$API_BASE/auth/me" \
  -H "Authorization: Bearer $TOKEN")

echo "レスポンス:"
echo "$ME_RESPONSE" | jq '.'

ME_IS_ADMIN=$(echo "$ME_RESPONSE" | jq -r '.data.isAdmin')
echo ""
echo "  isAdmin: $ME_IS_ADMIN"

if [ "$ME_IS_ADMIN" == "true" ]; then
  echo "  ✅ /auth/me でも isAdmin フラグが正しく返されています"
else
  echo "  ❌ /auth/me の isAdmin フラグが false または null です"
fi

echo ""
echo "=== テスト完了 ==="
