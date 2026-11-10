# QuantWM Human Preference Study — 直接上传视频版

**独立网站：不会扫描、修改、依赖原 QuantWM 项目。**

## 网站功能
- 匿名评估者：对每组 QVG 与 QuantWM 视频随机 A/B 展示，分别按 Temporal Flickering、Temporal Consistency、Motion Smoothness、Visual Quality 四项打 1–5 分，并给出整体偏好。
- 管理员：登录 `admin.html` 查看聚合结果、原始记录，并导出 CSV。通过 Supabase Auth + 数据库 RLS 保护，匿名参与者不能读取投票。
- 视频：你自行上传到**新仓库 `videos/` 文件夹**，在 `pair-builder.html` 配对后下载 `stimuli.json` 配置。

## 1. 新建独立 GitHub 仓库
1. 打开 https://github.com/new ，Owner 选 `QuantWM-project`（需有建仓权限），Repository name 填 `QuantWM-Human-Study`，Public，Create repository。**不要 Fork 原仓库**。
2. 解压本项目 ZIP，将 `QuantWM-Human-Study/` **内部的所有内容**上传到新仓库根目录（GitHub 的 Add file → Upload files）。可采用本地 git push 上传整个文件夹，尤其适合目录结构。
3. 进入新仓库 Settings → Pages → Source: Deploy from a branch → main / (root) → Save。
4. 预计网站为 https://quantwm-project.github.io/QuantWM-Human-Study/ ，视频配置页面为 `.../pair-builder.html`，管理员结果页为 `.../admin.html`。如果仓库由其他 Owner 创建，网址以实际 Pages URL 为准。

## 2. 直接上传自己的视频
1. 给同一个条件下的两段视频起**中性文件名**，例如 `scene01_a.mp4` 和 `scene01_b.mp4`，不要使用 `QVG` 或 `Ours` 等显露身份的词。
2. 在新仓库点击 `videos` 文件夹 → **Add file → Upload files** → 选择 MP4/WebM 视频 → Commit changes。
3. GitHub 浏览器上传单个文件限制一般为 25 MiB；大文件请使用 Git LFS 配合 git push，或另用对象存储。**GitHub Pages 对视频容量和带宽有配额，不适合大量大视频**。不要上传隐私敏感视频。
4. 访问 `.../pair-builder.html`，点击“增加视频对”，填模型、场景和视频文件名（例如 `scene01_a.mp4`、`scene01_b.mp4`），分别填到真正对应的 QVG 和 QuantWM 字段。
5. 点击“下载 stimuli.json”，将下载的 JSON 上传到**新仓库根目录**，覆盖同名文件（可进入文件后编辑/提交，也可以 git push）。刷新首页即可看到盲测视频。

**配置文件例子（每对两段视频使用同一 prompt、seed、动作序列及长度）：**
```json
{
  "pairs": [
    {
      "id": "pair_001_scene01",
      "model": "HY-World 1.5",
      "scene": "scene01",
      "videos": {
        "qvg": "videos/scene01_a.mp4",
        "quantwm": "videos/scene01_b.mp4"
      }
    }
  ]
}
```

**重要**：网站的 HTML 界面只显示 A/B，但公开静态文件及 `stimuli.json` 可被技术人员在浏览器开发者工具中查看；这是常规界面盲测，不是防技术分析的密码学双盲。若要求严格盲测，应把方法映射放在服务器端而不是公开 JSON 中。

## 3. 配置匿名投票与私有统计数据库
1. 打开 https://supabase.com/dashboard ，创建 Supabase Project。
2. Supabase 的 SQL Editor → New query，将 `supabase.sql` 全部复制进去，Run。
3. Authentication → Users → Add user，新建你自己的管理员账号（邮箱、密码），复制 **User UID**。
4. SQL Editor 运行（替换实际 UID）：
   ```sql
   insert into public.study_admins (user_id)
   values ('YOUR-ADMIN-USER-UUID')
   on conflict do nothing;
   ```
5. 在新仓库根目录编辑 `config.js` 中的 `supabaseUrl` 与 `supabasePublishableKey`（使用 Supabase 的 Project URL 和 publishable/anon key）。**绝不能上传数据库密码、service_role/secret key 或管理员密码**。
6. 访问 `.../admin.html` 使用你的邮箱密码登录，检查是否可查看结果。普通访客无需登录即可提交，不能读取投票记录。建议在 Supabase Authentication 中关闭公开邮箱注册。

## 4. 验证
- 无痕浏览器访问投票首页，确认随机 A/B 位置、两段视频播放正常，并对一组提交。
- 管理员登录 `admin.html`，检查评分、偏好与 CSV 导出。
- 匿名登录状态下不要能读取投票结果（数据库 RLS 已拒绝 SELECT）。
- 记录评估者数量、视频对数量、抽样和随机化方案；为 ICLR rebuttal 计算配对统计/置信区间。

## 文件一览
- `index.html`：公开问卷
- `pair-builder.html` + `assets/builder.js`：本地视频配置器（无扫描）
- `videos/`：你自行上传的 MP4/WebM（初始为空）
- `stimuli.json`：配对文件（初始为空）
- `admin.html`：管理员统计与 CSV
- `config.js`：Supabase 的公共配置信息
- `supabase.sql`：数据库建表、访问权限

**局限**：这个纯静态 GitHub Pages 版本不能让网页本身直接把文件写入 GitHub 仓库。视频通过 GitHub Upload files 上传；配对页面只生成 JSON。若希望“管理员登录网页 → 选择 MP4 → 一键上传并上线”，需要改用 Supabase Storage 或类似对象存储，并增加受限的上传管理页面。
