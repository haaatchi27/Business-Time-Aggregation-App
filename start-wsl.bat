@echo off
chcp 65001 > nul
echo ==========================================
echo  業務時間集計アプリ WSL起動ツール
echo ==========================================

:: WSLコマンドが使えるか確認
where wsl >nul 2>&1
if %errorlevel% neq 0 (
    echo [エラー] WSL がインストールされていないか、有効になっていません。
    echo Windowsの機能から「Linux 用 Windows サブシステム」を有効にしてください。
    pause
    exit /b
)

:: スクリプトのディレクトリに移動
cd /d "%~dp0"

echo [*] WSL上で環境セットアップ（npm install）を確認/実行しています...
:: 依存関係が含まれる node_modules が無い場合は setup.sh を叩くか npm install
wsl bash -c "if [ ! -d 'node_modules' ]; then bash setup.sh; fi"

echo [*] サーバーを起動します...
echo 終了するにはこのウィンドウを閉じるか、Ctrl+Cを押してください。
echo ブラウザで http://localhost:3000 にアクセスしてください。
echo.

:: サーバー起動
wsl bash -c "npm start"

pause
