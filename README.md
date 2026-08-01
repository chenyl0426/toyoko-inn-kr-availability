# 韩国东横 INN 房况查询

[简体中文](README.md) | [English](README.en.md) | [日本語](README.ja.md) | [한국어](README.ko.md)

按地区选择韩国东横 INN，一次比较所选酒店的实时余房、房型、住宿计划与官网价格。本站仅供检索比较，最终预订仍在东横 INN 官网完成。

![酒店选择界面](public/og-hotel-selector.png)

## 在线体验

- Vercel：[toyoko-inn-korea-availability.vercel.app](https://toyoko-inn-korea-availability.vercel.app)
- ChatGPT Page：[toyoko-korea-rooms.xiongmiao2004.chatgpt.site](https://toyoko-korea-rooms.xiongmiao2004.chatgpt.site)

> 上述地址为部署占位符，上线后请替换为正式地址。

## 功能亮点

- 覆盖韩国 7 个城市的 13 家东横 INN，可按地区全选或逐家选择。
- 一次设置入住日期、退房日期、每室成人数、房间数及吸烟偏好。
- 仅在用户点击查询后按需访问官网，不进行后台轮询或自动下单。
- 最多并发查询 3 家酒店，实时显示逐店进度；单店失败不影响其他结果。
- 严格区分有房、无房、吸烟类别不匹配和查询失败，并支持单店重试。
- 展示房型、住宿计划、普通价/会员价、KRW 住宿总价及官网预订入口。
- 仅在浏览器本地保存最近 10 条查询条件，不保存库存或价格结果。
- 支持简体中文、英语、日语和韩语，右上角可随时切换。

## 使用方法

1. 在页面右上角选择界面语言。
2. 按地区展开酒店列表，选择一家或多家酒店。
3. 设置入住/退房日期、每室成人数、房间数及吸烟偏好。
4. 点击“查询余房”，等待所选酒店逐家返回结果。
5. 按需要查看全部酒店、仅看有房或仅看查询失败，并可重试单家酒店。
6. 找到合适方案后前往东横 INN 官网，确认最新库存、适用资格与最终价格。

## 多语言

| 语言 | Locale |
| --- | --- |
| 简体中文 | `zh-CN` |
| English | `en-US` |
| 日本語 | `ja-JP` |
| 한국어 | `ko-KR` |

首次访问会根据浏览器语言选择界面语言，不支持的语言回退为简体中文。手动选择后，偏好会保存在 `localStorage` 与同站点 Cookie 中，以便刷新和服务端渲染保持一致。日期、韩国时间与 KRW 货币格式会随 locale 变化；酒店、城市、界面状态、表单、错误提示和无障碍文案均已本地化。

东横 INN 官网动态返回的日文房型与住宿计划名称会保留为原文，并同时提供本地化展示名，方便核对官网信息。

## 本地运行

需要 Node.js `>=22.13.0`。

```bash
git clone https://github.com/chenyl0426/toyoko-inn-kr-availability.git
cd toyoko-inn-kr-availability
npm ci
npm run dev
```

打开终端显示的本地地址即可使用。当前项目无需环境变量、D1 或 R2。

## 常用命令

| 命令 | 用途 |
| --- | --- |
| `npm run dev` | 启动 vinext 本地开发服务器 |
| `npm run build` | 构建 ChatGPT Page / OpenAI Sites 使用的 Cloudflare Worker 输出 |
| `npm run vercel-build` | 执行 Vercel 使用的 Next.js 构建 |
| `npm test` | 构建并运行服务端渲染回归测试 |
| `npm run lint` | 运行 ESLint 检查 |
| `npm run db:generate` | 在未来启用 Drizzle schema 后生成迁移 |

## 部署

### Vercel

仓库中的 `vercel.json` 已将框架设为 Next.js，并使用 `npm run vercel-build`。在 Vercel 导入本 GitHub 仓库，将生产分支设为 `main`，并使用满足 `>=22.13.0` 的 Node.js 版本即可部署；当前无需配置环境变量。

### ChatGPT Page / OpenAI Sites

项目通过 `.openai/hosting.json`、Sites Vite 插件与 Cloudflare Worker 配置支持 ChatGPT Page。先运行 `npm run build` 验证构建，再通过 Codex / OpenAI Sites 的发布流程上线。不要手动共享 Sites 项目 ID、写入凭据或修改托管资源绑定。

两种平台使用同一份源码，但 Vercel 使用 Next.js 构建，ChatGPT Page 使用 vinext / Sites 构建。

## 项目结构

```text
app/                    页面、组件及余房 API
lib/                    酒店配置、类型、国际化与官网适配器
tests/                  服务端渲染回归测试
public/                 图标与社交预览图
.openai/hosting.json    ChatGPT Page / OpenAI Sites 配置
vercel.json             Vercel 构建配置
```

## 数据与免责声明

本项目不是东横 INN 官方网站。数据来自官网公开查询页面，库存和价格可能随时变化，官网限流、验证要求或页面结构变化也可能导致查询失败。本项目不登录东横 INN 账号、不代为预订或支付，也不保存账号、Cookie、库存或价格；所有预订条件和最终价格均以东横 INN 官网为准。
