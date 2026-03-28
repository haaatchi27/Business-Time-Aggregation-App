#!/bin/bash
# 業務時間集計アプリ WSL/Linux用セットアップスクリプト

echo "=========================================="
echo " 業務時間集計アプリ 環境セットアップ (Linux)"
echo "=========================================="

# Node.jsがインストールされているか確認
if ! command -v node &> /dev/null
then
    echo "[-] Node.js が見つかりません。"
    echo "[!] apt を使用して Node.js と npm をインストールします..."
    
    # ユーザーにパスワードを求める可能性があるので注意が必要ですが、
    # WSLのデフォルトユーザーならsudoが使える前提とします
    sudo apt-get update
    sudo apt-get install -y nodejs npm
    
    if ! command -v node &> /dev/null
    then
        echo "[-] Node.js のインストールに失敗しました。手動でインストールしてください。"
        exit 1
    fi
    echo "[+] Node.js のインストールが完了しました: $(node -v)"
else
    echo "[+] Node.js はインストール済みです: $(node -v)"
fi

# 依存パッケージのインストール
echo "[*] npm パッケージをインストールします..."
npm install

if [ $? -eq 0 ]; then
    echo "[+] パッケージのインストールが完了しました！"
    echo ""
    echo "=> 起動するには以下のコマンドを実行してください："
    echo "   npm start"
    echo ""
else
    echo "[-] パッケージのインストール中にエラーが発生しました。"
    exit 1
fi
