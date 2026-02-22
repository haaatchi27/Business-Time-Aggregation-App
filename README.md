# 業務時間集計アプリ (Business Time Tracker)

> [!NOTE]
> 本プロジェクトは Antigravity によるテストプロジェクトです。

シンプルかつ強力な業務時間計測・集計ツールです。タスクごとに時間を記録し、日別・週別・カテゴリ別のレポートを自動生成します。

![Main Interface](https://via.placeholder.com/800x450.png?text=Activity+Tracker+Interface)

## 特徴

- **リアルタイム計測**: ワンクリックでタスクの開始・停止が可能。
- **カテゴリ管理**: タスクをプロジェクトや作業種別ごとのカテゴリに分類。
- **多機能レポート**:
  - **日別レポート**: グラフ（Chart.js）による視覚的な時間配分の確認。
  - **週別レポート**: 週ごとの稼働時間を集計。
  - **カテゴリ別レポート**: カテゴリごとに週次の集計を表示。
- **30分丸め機能**: カテゴリ別レポートでは、実務に即した30分単位の丸め処理（15分/45分基準）に対応。
- **多言語対応**: 日本語と英語をボタン一つで切り替え可能。
- **レスポンシブデザイン**: 美しくモダンなUIで、操作性に優れています。
- **Docker対応**: 開発環境の構築が容易で、データの永続化も設定済み。

## セットアップ

### 前提条件
- Docker および Docker Compose がインストールされていること

### 実行手順

1. リポジトリをクローンします。
   ```bash
   git clone https://github.com/haaatchi27/Business-Time-Aggregation-App
   cd Business-Time-Aggregation-App
   ```

2. サーバーを起動します（制御スクリプトを利用します）。
   ```bash
   # 通常起動（起動済みの場合は何もしません）
   ./start_server.sh

   # 再起動（コンテナを再ビルドして再起動します）
   ./start_server.sh restart
   ```

3. ブラウザでアクセスします。
   [http://localhost:3000](http://localhost:3000)

## スクリプトの機能

- **自動状態確認**: サービスが既に実行中の場合は二重起動を防ぎます。
- **Rebuild Restart**: `restart` 引数を渡すことで、`docker compose down` の実行後に `--build` オプション付きで最新のコードを反映して再起動します。
- **管理者権限**: WSL/Linux環境での利用を想定し、内部で `sudo` を使用しています。

## 開発者向け情報

### 技術スタック
- **Backend**: Node.js (Express)
- **Database**: SQLite3 (`better-sqlite3`)
- **Frontend**: Vanilla JavaScript, CSS, HTML
- **Visualization**: Chart.js
- **Container**: Docker + Alpine Linux

### ディレクトリ構造
- `server.js`: API サーバー本体
- `db.js`: データベース初期化・接続
- `public/`: フロントエンド資産（HTML/JS/CSS）
- `data/`: データベースファイル保存先（Dockerボリューム）

## ライセンス

MIT License
