#!/bin/bash

echo "======================================"
echo "  Web SSH Server with localhost.run"
echo "======================================"
echo ""

# 依存パッケージのチェックとインストール
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
    echo ""
fi

# サーバーのポート
PORT=${PORT:-3002}

echo "🚀 Starting Web SSH Server on port $PORT..."
echo ""

# サーバーをバックグラウンドで起動
node server.js &
SERVER_PID=$!

# サーバーが起動するまで少し待つ
sleep 2

echo ""
echo "✅ Server started (PID: $SERVER_PID)"
echo "📍 Local: http://localhost:$PORT"
echo ""
echo "🌐 Starting localhost.run tunnel..."
echo ""

# localhost.runを起動（これがメインプロセスになる）
ssh -R 80:localhost:$PORT nokey@localhost.run

# localhost.runが終了したらサーバーも停止
echo ""
echo "🛑 Stopping server..."
kill $SERVER_PID 2>/dev/null
echo "👋 Goodbye!"
