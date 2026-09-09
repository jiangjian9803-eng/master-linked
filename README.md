# Master Linked

一个以隐私和人工确认优先的开源外联工作台。当前版本是零依赖静态 Web/PWA 原型：联系人和模板只保存在浏览器 `localStorage`，消息发送前会复制模板并打开联系人提供的 LinkedIn 链接，发送由用户本人确认，避免自动化操作带来的账号风险。

## 本地运行

直接双击 `index.html` 即可使用；部署到 GitHub Pages、Netlify 或任意静态主机也可以直接访问。

## 安装桌面版

安装 Node.js 后，在项目目录执行 `npm install`，然后执行 `npm run start` 预览。使用 `npm run dist` 可生成 macOS、Windows 和 Linux 安装包。
项目已配置 GitHub Actions；在 GitHub Actions 页面手动运行 `Build desktop installers`，即可下载对应平台安装包。

## CSV 导入

首行建议使用 `姓名,LinkedIn,公司`（也支持英文 `name,linkedin,company`）。

## 后续路线

- PWA 安装与离线缓存
- 更稳健的 CSV/Excel 导入导出
- 可审计的发送记录与批次控制
- OAuth 登录（仅在有官方授权接口时接入）

本项目不绕过 LinkedIn 的安全验证，也不模拟批量点击或自动发送。
