# 韓国東横INN空室検索

[简体中文](README.md) | [English](README.en.md) | [日本語](README.ja.md) | [한국어](README.ko.md)

韓国の東横INNを地域別に選び、選択したホテルの空室、客室タイプ、宿泊プラン、公式料金を一度に比較できます。本サイトは検索・比較専用で、予約は東横INN公式サイトで行います。

![ホテル選択画面](public/og-hotel-selector.png)

## デモ

- Vercel：[toyoko-inn-korea-availability.vercel.app](https://toyoko-inn-korea-availability.vercel.app)

## 主な機能

- 韓国7都市、13軒の東横INNに対応し、地域単位またはホテル単位で選択できます。
- チェックイン・チェックアウト、1室あたりの大人の人数、室数、喫煙条件を一度だけ入力します。
- 公式サイトへのアクセスはユーザーが検索した時だけ行い、バックグラウンド監視や自動予約は行いません。
- 最大3軒を並行して検索し、ホテルごとの進捗を表示します。1軒の失敗はほかの結果に影響しません。
- 空室あり、満室、喫煙条件不一致、検索失敗を区別し、ホテル単位で再試行できます。
- 客室タイプ、宿泊プラン、一般/会員料金、KRW建ての宿泊合計、公式予約リンクを表示します。
- ブラウザには直近10件の検索条件のみを保存し、在庫や料金結果は保存しません。
- 簡体字中国語、英語、日本語、韓国語に対応し、右上の目立つ切り替えメニューから変更できます。

## 使い方

1. 右上の言語切り替えで表示言語を選びます。
2. 地域を展開し、1軒以上のホテルを選択します。
3. 日付、1室あたりの大人人数、室数、喫煙条件を設定します。
4. 空室検索を開始し、各ホテルの結果を待ちます。
5. 全ホテル、空室あり、検索失敗の表示を切り替え、必要に応じて1軒だけ再試行します。
6. 希望するプランから公式サイトへ進み、最新の在庫、利用資格、最終料金を確認します。

## 多言語対応

| 言語 | Locale |
| --- | --- |
| 簡体字中国語 | `zh-CN` |
| English | `en-US` |
| 日本語 | `ja-JP` |
| 한국어 | `ko-KR` |

初回アクセス時はブラウザの言語を使用し、未対応の言語では簡体字中国語にフォールバックします。手動で選んだ言語は `localStorage` と同一サイトのCookieに保存され、再読み込み時とサーバーレンダリング時にも維持されます。日付、韓国時間、KRW通貨は locale に応じて整形され、ホテル名、都市名、画面状態、フォーム、エラー、アクセシビリティ用文言もローカライズされます。

公式サイトから動的に返される日本語の客室名・宿泊プラン名は原文を残し、照合しやすいようローカライズされた表示名も併記します。

## ローカル開発

Node.js `>=22.13.0` が必要です。

```bash
git clone https://github.com/chenyl0426/toyoko-inn-kr-availability.git
cd toyoko-inn-kr-availability
npm ci
npm run dev
```

開発サーバーが表示するローカルURLを開いてください。現在、環境変数、D1、R2は不要です。

## コマンド

| コマンド | 用途 |
| --- | --- |
| `npm run dev` | vinext開発サーバーを起動 |
| `npm run build` | ChatGPT Page / OpenAI Sites用のCloudflare Worker出力をビルド |
| `npm run vercel-build` | Vercel用のNext.jsビルドを実行 |
| `npm test` | ビルド後にサーバーレンダリングの回帰テストを実行 |
| `npm run lint` | ESLintを実行 |
| `npm run db:generate` | 将来Drizzle schemaを有効にした場合にマイグレーションを生成 |

## デプロイ

### Vercel

`vercel.json` ではフレームワークをNext.js、ビルドコマンドを `npm run vercel-build` に設定しています。このGitHubリポジトリをVercelへインポートし、本番ブランチを `main`、Node.jsを `>=22.13.0` に対応するバージョンへ設定してください。現在、環境変数は不要です。

### ChatGPT Page / OpenAI Sites

`.openai/hosting.json`、Sites Viteプラグイン、Cloudflare Worker互換ビルドによりChatGPT Pageへ対応しています。`npm run build` を実行してから、Codex / OpenAI Sitesの公開フローでデプロイします。SitesのプロジェクトIDや認証情報を共有したり、管理対象のホスティングバインディングを手動で書き換えたりしないでください。

両方の環境で同じソースを使用しますが、VercelはNext.jsビルド、ChatGPT Pageはvinext / Sitesビルドを使用します。

## プロジェクト構成

```text
app/                    ページ、コンポーネント、空室API
lib/                    ホテル設定、型、多言語、公式サイトアダプター
tests/                  サーバーレンダリング回帰テスト
public/                 アイコン、ソーシャルプレビュー画像
.openai/hosting.json    ChatGPT Page / OpenAI Sites設定
vercel.json             Vercelビルド設定
```

## データと免責事項

本プロジェクトは東横INNの公式サイトではなく、東横INNが運営するものでもありません。データは公式サイトの公開検索画面から取得するため、在庫と料金は随時変わります。アクセス制限、認証要求、ページ構造の変更により検索が失敗する場合もあります。ログイン、予約、決済は行わず、アカウント、Cookie、在庫、料金も保存しません。予約条件と最終料金は必ず東横INN公式サイトで確認してください。
