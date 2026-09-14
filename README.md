# Master Linked

一个以隐私和人工确认优先的开源外联工作台。当前版本是零依赖静态 Web/PWA 原型：联系人和模板只保存在浏览器 `localStorage`，消息发送前会复制模板并打开联系人提供的 LinkedIn 链接，发送由用户本人确认，避免自动化操作带来的账号风险。

## 本地运行

直接双击 `index.html` 即可使用；部署到 GitHub Pages、Netlify 或任意静态主机也可以直接访问。

## 安装桌面版

安装 Node.js 后，在项目目录执行 `npm install`，然后执行 `npm run start` 预览。使用 `npm run dist` 可生成 macOS、Windows 和 Linux 安装包。
正式轻量版使用 Tauri：`npm install` 后执行 `npm run tauri:build`。Tauri 复用系统 WebView，安装包通常远小于 Electron；Tauri 2 后续可扩展 Android 和 iOS。
项目已配置 GitHub Actions；在 GitHub Actions 页面手动运行 `Build desktop installers`，即可下载对应平台安装包。
正式版本将发布在仓库的 **Releases** 页面；推送 `v*` 标签后会自动构建并发布轻量版安装包。

## CSV 导入

首行建议使用 `姓名,LinkedIn,公司`（也支持英文 `name,linkedin,company`）。

## 后续路线

- PWA 安装与离线缓存
- 更稳健的 CSV/Excel 导入导出
- 可审计的发送记录与批次控制
- OAuth 登录（仅在有官方授权接口时接入）

本项目不绕过 LinkedIn 的安全验证，也不模拟批量点击或自动发送。

## ContactOut with ChatGPT

侧栏“会议记录”下方提供 ContactOut 官方 MCP 的 ChatGPT 接入向导。使用的远程 MCP 地址为 `https://contactout.com/mcp`。API token 只应在 ContactOut 的授权流程中输入，不会保存在本站或仓库中。ChatGPT 自定义 MCP App 的可用性取决于套餐和工作区权限。

该模块还提供批量搜索工作台：根据职位、地区、公司、技能和人数生成结构化 ChatGPT 搜索指令，解析 ChatGPT/ContactOut 返回的 JSON，预览候选人、去重加入本地联系人并导出 UTF-8 CSV。启用 `reveal_info` 前会明确提示联系方式额度消耗。

新版 ChatGPT/Codex 客户端优先从 `Settings → Plugins` 查找并连接服务。自定义 MCP/App 管理入口仅在符合条件且获得相应权限的工作区中显示；若插件目录没有 ContactOut，需要工作区管理员添加远程 MCP，或另行安装本地自定义插件。
