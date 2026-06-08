# TimeCraft

> 時間を管理するのではなく、時間をつくる。
> 予定を詰め込むのではなく、人生に必要な余白を設計する。

TimeCraft は、単なる ToDo 管理やタイマーアプリではなく、
**「自分の時間の使い方を設計し、理想の生活・仕事・人生に近づくためのタイムクラフティングアプリ」** です。

タスクを大量にこなすことではなく、
本当に重要な予定を配置し、余白を守りながら、毎週改善していくことを目的とします。

---

## 主な機能（MVP）

| 画面 | 内容 |
| --- | --- |
| ダッシュボード | 今日の優先ボックス・KPI（資産時間 / 余白時間 / 完了数）・詰め込みすぎ診断 |
| 週間スケジュール | 2時間ブロック × 7日のグリッド、ドラッグ感覚で追加できる空セル |
| 今日ビュー | 優先ボックスを中心とした今日の流れ、開始 / 一時停止 / 完了 / 延期 |
| 日次レビュー | できたこと・できなかったこと・満足度・明日への改善 |
| 週次レビュー | 一番良かったボックス・来週減らすこと / 増やすこと・来週の最優先テーマ |
| 分析 | タイプ別・曜日別の積み上げ、前週との差分、予定と実績のズレ |
| 設定 | Google カレンダー連携・データ管理 |

### ボックス種別（9種類）

- 📌 固定ボックス：動かせない予定
- 🔥 優先ボックス：1日 2〜3 個までを推奨。4個以上で警告
- 💎 資産ボックス：未来の自由・収益につながる活動
- 🌿 回復ボックス：睡眠・食事・運動・休憩
- 📨 雑務ボックス：シャローワークを一括処理
- ☁️ 余白ボックス：1日 2時間以上を推奨。下回ると警告
- 💗 デートボックス：大切な人との時間
- 🪞 内省ボックス：日記・週次レビュー
- 🌙 オンラインデトックスボックス：スマホ・SNS なし

### 詰め込みすぎ診断（自動）

- 優先ボックスが 1日 4個以上ある
- 余白ボックスが 1日 2時間未満
- 雑務ボックスが分散している
- 回復ボックスが少ない
- 活動時間が 14時間を超えている

---

## 技術構成

- **Framework**: Next.js 16 (App Router) + TypeScript + Turbopack
- **Styling**: Tailwind CSS v4
- **State**: Zustand + `persist` ミドルウェア（localStorage）
- **Date**: date-fns
- **Icons**: lucide-react
- **Font**: Noto Sans JP
- **OAuth**: `@react-oauth/google`（Google カレンダー連携）

> MVP ではバックエンド不要。すべて `localStorage` に保存されます。
> 後から Supabase / Firebase に差し替えやすい設計です（`src/store/useTimeCraftStore.ts` を差し替えるだけ）。

---

## Google カレンダー連携のセットアップ

既存の Google カレンダーの予定を **固定ボックス** として自動取り込みできます。
権限は **読み取り専用**。Google 側の予定は一切変更しません。

### セットアップ手順

1. [Google Cloud Console](https://console.cloud.google.com/) でプロジェクトを作成
2. 「**API とサービス** → **ライブラリ**」で **Google Calendar API** を有効化
3. 「**OAuth 同意画面**」を設定（ユーザータイプ：外部、テストユーザーに自分の Google アカウントを追加）
4. 「**認証情報** → **認証情報を作成** → **OAuth クライアント ID**」を選び、アプリケーションの種類は **ウェブアプリケーション**
5. 「**承認済みの JavaScript 生成元**」に以下を追加：
   - `http://localhost:3000`（開発用）
   - 本番デプロイ先の URL（例：`https://timecraft.example.com`）
6. 発行されたクライアント ID をプロジェクトルートの `.env.local` に設定：
   ```bash
   NEXT_PUBLIC_GOOGLE_CLIENT_ID=xxxxxxxxxxxxxx.apps.googleusercontent.com
   ```
7. `npm run dev` で開発サーバーを再起動
8. アプリ右下「**設定**」→「**Google カレンダー連携**」から接続

### 取り込みの仕様

- イベントは **固定ボックス** として取り込まれます
- `googleEventId` で **冪等な再同期** を保証（重複しません）
- ユーザーが手動編集したボックスは、次回同期で **上書きされません**
- 同日内のイベントのみ取り込み（日跨ぎはスキップ）
- 終日イベントは `00:00 - 23:59` として取り込み
- 取得範囲は「過去 N 週 〜 未来 N 週」で設定画面から変更可能

---

## 開発

```bash
cd timecraft
npm install
npm run dev
# http://localhost:3000
```

### ビルド

```bash
npm run build
npm run start
```

### 主要ディレクトリ

```
src/
  app/                       # ページ（App Router）
    page.tsx                 # ダッシュボード
    week/page.tsx            # 週間スケジュール
    today/page.tsx           # 今日ビュー
    reviews/                 # 日次・週次レビュー
    analytics/page.tsx       # 分析
    settings/page.tsx        # 設定（Google 連携など）
  components/
    AppShell.tsx             # サイドバー / モバイルヘッダー
    GoogleProvider.tsx       # OAuth プロバイダー
    GoogleCalendarPanel.tsx  # Google カレンダー連携 UI
    WeekGrid.tsx             # 2時間ブロックグリッド
    BoxCard.tsx              # グリッド内のボックス
    BoxListItem.tsx          # リスト表示のボックス
    BoxFormDialog.tsx        # 作成 / 編集モーダル
    BoxActions.tsx           # 開始・完了・中断・延期
    WarningBanner.tsx        # 詰め込みすぎ診断バナー
    HydrationGate.tsx        # localStorage ハイドレーション待ち
    ui/                      # Button / Modal / Field / PageHeader
  lib/
    types.ts                 # Box / DailyReview / WeeklyReview / Google 関連
    boxTypes.ts              # 9種のボックス種別マスタ
    timeBlocks.ts            # 2時間ブロック定義
    diagnose.ts              # 詰め込みすぎ診断ロジック
    google-calendar.ts       # Google Calendar API クライアント
    google-sync.ts           # 同期ロジック（イベント→固定ボックス）
    date.ts                  # 週開始 / 週終わり
    cn.ts                    # clsx ラッパ
    id.ts                    # ID 生成
  store/
    useTimeCraftStore.ts     # Zustand ストア（永続化）
```

---

## ロードマップ

### Phase 1（実装済み）

- 週間ビュー、ボックスの作成 / 編集 / 削除、9種類のボックス種別、今日ビュー

### Phase 2（実装済み）

- 実行状態管理（未開始 / 実行中 / 一時停止 / 完了 / 延期）
- 日次レビュー
- 詰め込みすぎ診断

### Phase 3（実装済み）

- 週次レビュー
- 分析画面（タイプ別・曜日別・前週比較・予定と実績のズレ）

### Phase 4（一部実装済み）

- ✅ Google カレンダー連携（読み取り・固定ボックスとして取り込み）
- ⏳ AI スケジュール提案（固定予定・優先タスク・余白からの提案）
- ⏳ 過去の実績ベースの自動改善提案
- ⏳ テンプレート機能（YouTube制作週 / 開発集中週 など）
- ⏳ スマホ通知
- ⏳ タイムクラフトスコア

---

## TimeCraft の最重要方針

TimeCraft は、予定を増やすアプリではない。
TimeCraft は、
**「本当に大事なことをやる時間」** と
**「何もしない余白」** を守るためのアプリである。

ユーザーが最終的に得るべき価値は、
たくさんのタスクをこなした達成感ではなく、
**自分の人生を自分で設計できている感覚** である。
