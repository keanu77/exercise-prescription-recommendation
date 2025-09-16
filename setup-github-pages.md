# 如何將運動處方系統放到 GitHub Pages

## 步驟 1：建立 GitHub 帳號和儲存庫

1. 到 [GitHub.com](https://github.com) 註冊帳號（如果還沒有的話）
2. 點選右上角的「+」→「New repository」
3. 儲存庫名稱輸入：`exercise-prescription-system`
4. 勾選「Public」和「Add a README file」
5. 點選「Create repository」

## 步驟 2：上傳文件

1. 在新建的儲存庫中，點選「uploading an existing file」
2. 將以下文件拖拽上傳：
   - `index.html`（主要網頁檔案）
   - `script.js`（JavaScript 功能）
   - 或者直接上傳整個資料夾

## 步驟 3：啟用 GitHub Pages

1. 在儲存庫頁面，點選「Settings」
2. 在左側選單找到「Pages」
3. 在「Source」選擇「Deploy from a branch」
4. 「Branch」選擇「main」，「Folder」選擇「/ (root)」
5. 點選「Save」

## 步驟 4：取得網址

5-10分鐘後，你的網站會在以下網址可用：
```
https://[你的用戶名].github.io/exercise-prescription-system/
```

## 步驟 5：在 Blogger 中嵌入

### 方法 A：直接嵌入完整頁面
在 Blogger 新增文章，使用以下 HTML：

```html
<div style="width: 100%; height: 100vh; border: none;">
    <iframe src="https://[你的用戶名].github.io/exercise-prescription-system/" 
            width="100%" height="800px" frameborder="0">
    </iframe>
</div>
```

### 方法 B：建立專屬頁面
1. 在 Blogger 點選「頁面」→「新增頁面」
2. 標題輸入「運動處方推薦系統」
3. 在 HTML 模式下貼上：

```html
<style>
.full-width-iframe {
    position: relative;
    width: 100%;
    height: 100vh;
    min-height: 800px;
}
.full-width-iframe iframe {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    border: none;
}
</style>

<div class="full-width-iframe">
    <iframe src="https://[你的用戶名].github.io/exercise-prescription-system/"></iframe>
</div>

<p style="margin-top: 20px; text-align: center; color: #666;">
    <small>
        本系統基於 ACSM FITT-VP 原則，提供個人化運動建議<br>
        製作者：<a href="https://wycswimming.blogspot.com/" target="_blank">運動醫學科 吳易澄醫師</a>
    </small>
</p>
```

## 優點

✅ **完整功能**：保留所有原始功能
✅ **快速載入**：GitHub Pages 速度快
✅ **易於更新**：直接修改 GitHub 上的文件即可更新
✅ **無廣告**：GitHub Pages 不會插入廣告
✅ **專業外觀**：獨立網址看起來更專業

## 注意事項

- GitHub Pages 有流量限制（但對個人使用來說很足夠）
- 更新後需要等 5-10 分鐘才會生效
- 如果儲存庫是 Public，任何人都可以看到源碼