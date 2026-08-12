# PROMPT GALLERY

画像生成AI用の汎用プロンプトを公開する静的サイト。ビルド不要、HTML/CSS/JS だけで動きます。

```
prompt-gallery/
├── index.html    骨組み（基本さわらない）
├── styles.css    見た目（色は先頭の :root を変えるだけ）
├── script.js     動作（基本さわらない）
├── data.js       ★ プロンプトはここに書く
└── images/       サムネイル画像を置く場所
```

## プロンプトを追加する

`data.js` の `PROMPTS = [ ... ]` に、`{ }` のかたまりをコピペして増やすだけです。

```js
{
  id: "p002",                       // 重複しない名前。URL（#p002）にもなる
  title: "カードの見出し",
  category: "商品紹介",              // 新しい名前を書くとフィルタタブが自動で増える
  tags: ["キャラクター", "SNS"],     // 検索でヒットする言葉
  emoji: "🍰",                      // 画像がないときカードに出る絵文字
  image: "images/p002.jpg",         // 画像がなければ "" でOK
  summary: "カードに出る短い説明。",
  attach: "キャラクターの画像（1枚）", // 添付不要なら ""
  prompt: `ここにプロンプト本文`,
},
```

### `{{ }}` の使い方

本文の中で `{{対象商品}}` のように書くと、**サイト上に入力欄が自動で作られます**。
訪問者がそこに言葉を入れると、本文中の同じ `{{ }}` がすべて置き換わった状態でコピーされます。

同じ言葉を何度も差し替えるタイプのプロンプトほど効きます。入力欄を出したくないときは、ただの文章として書けばOKです。

### 画像について

`images/` に置いて `image: "images/p002.jpg"` と書きます。
横長（4:3 くらい）、幅 800〜1200px、1枚 300KB 以下が目安。ファイル名は英数字にしてください。

## 公開（GitHub Pages）

1. GitHub で新しいリポジトリを作る（Public）
2. このフォルダの中身をアップロード（またはローカルで下記を実行）

```bash
git init
git add -A
git commit -m "初回公開"
git branch -M main
git remote add origin https://github.com/ユーザー名/リポジトリ名.git
git push -u origin main
```

3. リポジトリの **Settings → Pages** を開く
4. Source を **Deploy from a branch**、Branch を **main / (root)** にして Save
5. 1〜2分待つと `https://ユーザー名.github.io/リポジトリ名/` で公開されます

以降は `data.js` を編集して push すれば、そのままサイトに反映されます。

## サイト名を変える

`data.js` の先頭にある `SITE` を書き換えてください。

| 項目 | どこに出るか |
|---|---|
| `title` | ブラウザのタブ、トップの大見出し |
| `shortTitle` | ヘッダー左上（長いと折り返すので短めに） |
| `logo` | ヘッダーの絵文字 |
| `description` | 見出しの下の説明文、「このサイトについて」 |
| `author` / `authorUrl` | フッターの名前とリンク |

**あわせて `index.html` の先頭も直してください。** SNSでシェアされたときのタイトルは、JavaScriptではなく `index.html` に直接書いた `<title>` と `<meta>` が使われます（SNSのクローラーはJavaScriptを動かさないため）。
