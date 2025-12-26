#!/bin/bash
# プロフィール編集機能の動作確認スクリプト

API_BASE="http://127.0.0.1:8787"

# テストユーザーID（実際のIDに置き換え）
TEST_USER_ID="test-user-123"
TEST_TOKEN="your-test-jwt-token-here"

# 更新するプロフィール情報
UPDATE_DATA=$(cat <<EOF
{
  "name": "Updated Name $(date +%s)",
  "bio": "Updated bio with timestamp $(date +%s)",
  "location": "東京, 日本",
  "website": "https://example.com",
  "photoUrl": "data:image/jpeg;base64,/9j/4AAQSkZJRg==",
  "bannerUrl": "data:image/jpeg;base64,/9j/4AAQSkZJRg=="
}
EOF
)

echo "=== プロフィール編集 API テスト ==="
echo ""
echo "API Base: $API_BASE"
echo "ユーザーID: $TEST_USER_ID"
echo ""
echo "--- ユーザー情報取得 ---"
curl -X GET "$API_BASE/users/$TEST_USER_ID" \
  -H "Authorization: Bearer $TEST_TOKEN" \
  -H "Content-Type: application/json" \
  -w "\nStatus: %{http_code}\n\n"

echo "--- プロフィール更新 ---"
RESPONSE=$(curl -X PUT "$API_BASE/users/$TEST_USER_ID" \
  -H "Authorization: Bearer $TEST_TOKEN" \
  -H "Content-Type: application/json" \
  -d "$UPDATE_DATA" \
  -w "\n%{http_code}")

HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)
BODY=$(echo "$RESPONSE" | head -n -1)

echo "レスポンス:"
echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
echo ""
echo "ステータスコード: $HTTP_CODE"
echo ""

if [ "$HTTP_CODE" = "200" ]; then
  echo "✅ プロフィール更新成功"
  echo ""
  echo "--- 更新後のユーザー情報取得 ---"
  curl -X GET "$API_BASE/users/$TEST_USER_ID" \
    -H "Authorization: Bearer $TEST_TOKEN" \
    -H "Content-Type: application/json" \
    -w "\nStatus: %{http_code}\n" | jq '.'
else
  echo "❌ プロフィール更新失敗"
fi
