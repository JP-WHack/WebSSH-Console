# WebSSH Console

**ブラウザで動作するSSHターミナル - ファイルアップロード機能付き**

[![License: MIT](https://img.shields.io/badge/License-MIT-ff6b6b.svg?style=for-the-badge)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-16%2B-51cf66?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![SSH](https://img.shields.io/badge/SSH-Terminal-2d3748?style=for-the-badge)](https://www.openssh.com/)

**ブラウザから任意のサーバーにSSH接続 - 追加ソフトウェア不要**

---

## 概要

WebSSH Consoleは、Webブラウザから直接SSH接続を可能にする軽量なアプリケーションです。ターミナルエミュレーター不要で、どこからでもサーバー管理が可能になります。

```
┌─────────────────────────────┐
│  Webブラウザ                 │
│  (Chrome/Firefox/Safari)    │
└──────────────┬──────────────┘
               │
               │  WebSocket
               ▼
┌─────────────────────────────┐
│  WebSSH Server              │
│  Node.js + Express + WS     │
└──────────────┬──────────────┘
               │
               │  SSH
               ▼
┌─────────────────────────────┐
│  リモートサーバー             │
│  (Linux/Unix)               │
└─────────────────────────────┘
```

## 機能

* **ブラウザベース** - 追加ソフトウェア不要、どこからでもアクセス
* **リアルタイム接続** - WebSocketによる低遅延SSH接続
* **ファイルアップロード** - ブラウザから直接ファイルをサーバーに転送
* **フルカラー対応** - xterm.jsによる完全なターミナルエミュレーション
* **セッション管理** - 複数のSSH接続を同時管理
* **localhost.run対応** - 簡単にインターネット公開可能
* **レスポンシブUI** - モバイル・デスクトップ両対応

## 必要要件

* Node.js 16以上
* npm または yarn
* インターネット接続（CDNリソース取得用）

## セットアップ手順

### 1. リポジトリのクローン

```bash
git clone https://github.com/yourusername/webssh-console.git
cd webssh-console
```

### 2. 依存パッケージのインストール

```bash
npm install
```

インストールされるパッケージ:
* `express` - Webサーバーフレームワーク
* `ws` - WebSocket実装
* `ssh2` - SSH2プロトコルクライアント
* `multer` - ファイルアップロード処理

### 3. サーバーの起動

```bash
npm start
```

または:

```bash
node server.js
```

サーバーが起動すると:

```
Web SSH Server running on port 3002
Access at http://localhost:3002

=== localhost.run Setup ===
To expose this server to the internet, run:
ssh -R 80:localhost:3002 nokey@localhost.run
```

### 4. ブラウザでアクセス

```
http://localhost:3002
```

## 使い方

### 基本的なSSH接続

1. ブラウザで `http://localhost:3002` を開く
2. 以下の情報を入力:
   * **ホスト**: サーバーのIPアドレスまたはホスト名
   * **ポート**: SSHポート（デフォルト: 22）
   * **ユーザー名**: SSHユーザー名
   * **パスワード**: パスワード
3. 「接続」ボタンをクリック

### ファイルアップロード

SSH接続が確立されると、ファイルアップロードフォームが表示されます:

1. 「ファイルを選択」ボタンをクリック
2. アップロードしたいファイルを選択
3. 「ファイルをアップロード」ボタンをクリック

**アップロード先:**
* デフォルト: ユーザーのホームディレクトリ
* フォールバック: `/tmp` ディレクトリ

### ショートカットキー

| キー | 機能 |
|------|------|
| `Ctrl + C` | プロセス中断 |
| `Ctrl + D` | EOF送信 |
| `Ctrl + L` | 画面クリア |
| `Tab` | コマンド補完 |
| `↑/↓` | コマンド履歴 |

## localhost.runで公開

### 方法1: 手動起動

別のターミナルで:

```bash
ssh -R 80:localhost:3002 nokey@localhost.run
```

表示されたURLでどこからでもアクセス可能になります。

### 方法2: start.shスクリプト使用

```bash
chmod +x start.sh
./start.sh
```

このスクリプトは:
1. 依存パッケージを自動インストール
2. サーバーをバックグラウンド起動
3. localhost.runトンネルを確立

または:

```bash
npm run tunnel
```

## 設定

### ポート番号の変更

環境変数で指定:

```bash
PORT=8080 node server.js
```

または `.env` ファイルを作成:

```env
PORT=8080
```

### セキュリティ設定

本番環境では以下の対策を推奨:

#### 1. HTTPS化

Nginxをリバースプロキシとして使用:

```nginx
server {
    listen 443 ssl http2;
    server_name ssh.yourdomain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://localhost:3002;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

#### 2. 認証機能の追加

Express-sessionとPassportを使用した認証を追加することを推奨します。

#### 3. レート制限

express-rate-limitで接続試行回数を制限:

```bash
npm install express-rate-limit
```

```javascript
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15分
    max: 100 // 最大100リクエスト
});

app.use(limiter);
```

## トラブルシューティング

### よくある問題

| 問題 | 対処 |
|------|------|
| WebSocketが接続できない | ファイアウォール・プロキシ設定を確認 |
| ファイルアップロードが失敗する | サーバーの書き込み権限を確認 |
| 日本語が文字化けする | ターミナルの文字コードをUTF-8に設定 |

### 詳細なデバッグ

サーバーログを確認:

```bash
node server.js
```

ブラウザのコンソールを確認:
1. F12キーを押す
2. Consoleタブを開く
3. エラーメッセージを確認

### ファイアウォール設定

サーバー側でポートを開放:

```bash
# Ubuntu/Debian
sudo ufw allow 3002/tcp

# CentOS/RHEL
sudo firewall-cmd --permanent --add-port=3002/tcp
sudo firewall-cmd --reload
```

## ファイル構成

```
webssh-console/
├── package.json           # プロジェクト設定
├── server.js             # メインサーバーコード
├── start.sh              # localhost.run起動スクリプト
├── public/
│   └── index.html        # フロントエンドUI
└── README.md             # このファイル
```

## 技術スタック

### バックエンド
* **Express** - Webサーバーフレームワーク
* **ws** - WebSocket実装
* **ssh2** - SSH2プロトコルクライアント
* **multer** - マルチパートフォーム処理

### フロントエンド
* **xterm.js** - ターミナルエミュレーター
* **WebSocket API** - リアルタイム通信
* **Vanilla JavaScript** - 依存関係なし

## セキュリティ注意事項

⚠️ **重要な注意事項**

* パスワードは平文でネットワーク経由で送信されます
* 本番環境では必ずHTTPS/WSSを使用してください
* 認証機能の追加を強く推奨します
* 信頼できないネットワークでの使用は避けてください
* ファイアウォールで適切なアクセス制限を設定してください

### 推奨される本番設定

1. **HTTPS/WSS必須** - Let's Encryptで無料SSL証明書を取得
2. **認証レイヤー追加** - Basic認証またはOAuth2.0
3. **IP制限** - 特定のIPアドレスからのみアクセス許可
4. **監査ログ** - すべてのSSH接続を記録
5. **セッションタイムアウト** - 一定時間後に自動切断

## 拡張アイデア

このアプリケーションは以下に拡張可能です:

* **SSH鍵認証対応** - パスワード認証に加えて鍵認証をサポート
* **マルチセッション管理** - タブ形式で複数SSH接続を管理
* **ファイルマネージャー** - GUI形式のファイル操作
* **コマンド履歴保存** - データベースにコマンド履歴を保存
* **ユーザー管理** - 複数ユーザーの権限管理
* **SFTP統合** - ドラッグ&ドロップでファイル転送
* **録画機能** - セッションの録画・再生
* **共同作業** - 複数ユーザーで同じセッションを共有

## 参考資料

* xterm.js公式ドキュメント: https://xtermjs.org/
* ssh2ライブラリ: https://github.com/mscdex/ssh2
* WebSocket API: https://developer.mozilla.org/en-US/docs/Web/API/WebSocket
* localhost.run: https://localhost.run/

## 開発支援

このプロジェクトが役立った場合、継続的な開発を支援することをご検討ください:

**Bitcoin (BTC):**
```
151feG2x2pUqG97p9kSKL7E3LgpukNWozT
```

すべての寄付は、無料で利用可能な開発ツールの維持と改善に役立ちます。

---

## 教育理念

本プロジェクトは、すべてのユーザーが無料で利用できる高品質なツールの提供に取り組んでいます。すべての機能は無料で提供され、今後も無料で利用可能です。

---

## 免責事項

本ソフトウェアは教育目的で提供されています。ユーザーは、使用が適用される法律および規制に準拠していることを確保する責任を負います。

---

*責任を持って使用してください*