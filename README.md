# Kumamoto Drone Flight

ブラウザだけですぐ遊べる、軽量な3Dドローンゲームを段階的に開発するプロジェクトです。

現在は **Step 1：開発環境の構築** です。最小ページのみを表示し、3D空間、ドローン、操作処理はまだ実装していません。

## 開発環境

- Windows / PowerShell
- Node.js 24系（構築時：24.20.0）
- npm（構築時：11.19.0）
- Vite / Vanilla JavaScript / Three.js

## 起動

```powershell
npm.cmd ci
npm.cmd run dev
```

ターミナルに表示されたローカルURLをブラウザで開きます。終了は `Ctrl+C` です。

## ビルドとプレビュー

```powershell
npm.cmd run build
npm.cmd run preview
```

公開用ファイルは `dist/` に出力されます。将来はこの静的ファイルをホスティングへ配置します。

## 構成

- `index.html`：ページの入口
- `src/main.js`：タイトル設定と最小ページの表示
- `src/style.css`：ページの見た目
- `AGENTS.md`：継続的な開発ルール
- `DEVELOPMENT_LOG.md`：作業記録

仮タイトルは `src/main.js` の `APP_TITLE` で変更できます。Three.jsは導入済みですが、Step 1では使用しません。

## 次の段階

Step 2で地面・光・カメラによる3D空間の表示を確認し、その後に仮ドローン、操作、追従カメラを段階的に追加します。各段階は承認後に進めます。
