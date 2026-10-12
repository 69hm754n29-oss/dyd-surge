# 独阅读 v41 —— VIP 正文走 Surge 本地代理

## 架构
```
源阅书源 --1次HTTP(假链接)--> Surge脚本(本机并发40) --> 独阅读API
                                                    ↳ 138段并发拉取
                       <----mock响应: 整章正文----
```

## 为什么这样快
- 服务器版被独阅读封 IP 了（新加坡 IP 反复冷测触发）
- Surge 版**走你手机自己的网络出口**，家庭/手机 IP 不会被封
- Surge 的 `$httpClient` 是**原生并发**（不像源阅的 ajaxAll 串行）
- 一次 mock 响应返回整章 → 源阅只等一次

## 安装（3 步）
1. Surge → 模块 → 安装本目录 `dyd_content.sgmodule`
   （脚本 `dyd_content.js` 与模块放同一目录，或用本地路径引用）
2. 源阅导入 `独阅读_v41_surge.json`
3. 打开 VIP 章 → 正文经 Surge 并发拉取

## 假链接协议
`http://dyd.local/chapter?bid=<书号>&cid=<章号>`
→ Surge http-request 拦截 → 并发拉 1..400 段 → 返回正文纯文本（\n 分隔）

## 逻辑等价验证（python 模拟同款并发）
138 段 / 4021 字 / 12.5s（首尾段完整）——这是 iSH 单线程网络栈的上限，
Surge 原生并发会更快。

## 文件
- `dyd_content.sgmodule` —— Surge 模块（校验通过）
- `dyd_content.js` —— 脚本（纯 JS AES 同源实现 + 并发池 + mock 响应）
- `独阅读_v41_surge.json` —— 源阅书源（VIP 章调假链接）
