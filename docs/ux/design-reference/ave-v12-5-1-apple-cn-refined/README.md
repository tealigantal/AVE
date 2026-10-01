# AVE v12.5.1 — Apple 中文产品体验精修版

这不是生产版 AVE，而是用于投资人/合作方展示的产品愿景原型。

## 在 VS Code 中打开

1. 解压 ZIP。
2. VS Code 选择“文件 → 打开文件夹”，打开 `ave-v12-5-apple-cn-refined`。
3. 打开“终端 → 新建终端”。
4. 执行：

   npm install
   npm run dev

5. 打开 Vite 给出的本地地址（通常是 `http://localhost:5173`）。

## 本版重点

- 重新按 Apple 中国官网式的产品页逻辑组织，而不是“大字 + 卡片”。
- 中文为主，使用系统字体栈（SF Pro / 苹方），不捆绑或分发任何字体文件。
- 标题进一步收敛，中文尺寸和字距不再压迫。
- 黑白章节交替，避免连续黑底导致疲劳。
- 产品视觉成为主角：素材云、故事理解图、故事方向、AI 创作协作、完整 Workspace、时间线、Before/After。
- 不向用户展示代码、命令、Edit IR、内部 patch、validator、素材 ID 等工程概念。
- Workspace 中保留了产品层面的安全感：用户只看到“保持什么、改了什么、是否应用”。
- 支持故事方向切换、修改应用、前后版本对比、Before/After 切换。
- GSAP ScrollTrigger + Framer Motion 提供滚动叙事和组件动画。
- 响应式适配桌面、平板和移动端。

## 推荐展示方式

桌面浏览器宽度 1440px 左右，进入全屏后从首页缓慢向下滚动。


## v12.5.1 修复

- 修复 Story Discovery 卡片动态 className 的 JSX 语法错误。
- 已使用 TypeScript JSX parser 做语法校验。
