# Notedown 笔记管理系统

一个基于HarmonyOS设计风格的现代化笔记管理应用，支持MySQL数据库存储。

## 功能特性

- 📝 创建、编辑、删除笔记
- 📂 支持文件附件（图片、文档等）
- 🔍 实时搜索和分类筛选
- 🌙 深色/浅色主题切换
- 🌐 多语言支持（中文、英文）
- 📱 响应式设计，支持移动端
- 🎯 HarmonyOS风格界面设计
- 💾 MySQL数据库存储

## 技术栈

- **前端**: HTML5 + CSS3 + JavaScript
- **后端**: Node.js + Express.js
- **数据库**: MySQL
- **文件上传**: Multer
- **界面风格**: HarmonyOS设计风格
- **背景效果**: Particles.js

## 项目结构

```
notedown/
├── assets/          # 静态资源
│   ├── css/
│   │   ├── global-ai.css
│   │   └── style.css
│   └── js/
│       ├── global-ai.js
│       └── script.js
├── pages/           # 页面文件
│   ├── index.html
│   ├── edit.html
│   ├── category.html
│   ├── edit.js
│   └── category.js
├── server/          # 后端服务
│   ├── server.js      # Express服务器
│   ├── package.json   # 依赖配置
│   ├── init-database.sql # 数据库初始化脚本
│   └── uploads/       # 文件上传目录
└── README.md          # 项目说明
```

## 快速开始

### 1. 数据库准备

1. 确保MySQL服务已启动
2. 使用Navicat连接到MySQL
3. 创建名为 `notedown` 的数据库
4. 执行 `server/init-database.sql` 脚本创建表结构

### 2. 后端服务启动

1. 进入后端目录：
   ```bash
   cd server
   ```

2. 安装依赖：
   ```bash
   npm install
   ```

3. 启动服务器：
   ```bash
   npm start
   ```

服务器将运行在 `http://localhost:3001`

### 3. 前端访问

1. 使用本地服务器打开 `index.html` 文件
2. 推荐使用 VS Code 的 Live Server 插件
3. 或者使用 Python 简单服务器：
   ```bash
   python -m http.server 8080
   ```
   然后访问 `http://localhost:8080`

## 数据库配置

在 `server/server.js` 中修改数据库连接配置：

```javascript
const db = mysql.createConnection({
  host: 'localhost',      // 数据库主机
  user: 'root',           // 数据库用户名
  password: '123456',     // 数据库密码
  database: 'notedown'    // 数据库名称
});
```

## API接口

### 笔记相关
- `GET /api/notes` - 获取所有笔记
- `GET /api/notes/:id` - 获取单个笔记
- `POST /api/notes` - 创建笔记
- `PUT /api/notes/:id` - 更新笔记
- `DELETE /api/notes/:id` - 删除笔记

### 文件相关
- `GET /api/files/:id` - 获取文件信息
- 文件访问：`/uploads/{filename}`

## 使用Navicat管理数据库

1. 打开Navicat，连接到MySQL
2. 创建 `notedown` 数据库
3. 执行初始化脚本创建表结构
4. 可以通过Navicat查看和管理笔记数据

## 注意事项

1. **端口冲突**: 如果3001端口被占用，可以在 `server.js` 中修改端口号
2. **数据库连接**: 确保MySQL服务已启动，数据库连接配置正确
3. **文件上传**: 上传的文件保存在 `server/uploads` 目录
4. **跨域问题**: 后端已配置CORS支持前端跨域访问
5. **文件大小限制**: 单个文件最大支持10MB

## 故障排除

### 常见问题

1. **无法连接到数据库**
   - 检查MySQL服务是否启动
   - 检查数据库连接配置是否正确
   - 检查数据库用户名和密码

2. **文件上传失败**
   - 检查 `server/uploads` 目录权限
   - 检查文件大小是否超过限制
   - 检查文件类型是否支持

3. **前端无法加载数据**
   - 检查后端服务是否正常运行
   - 检查浏览器控制台是否有错误信息
   - 检查网络连接是否正常

## 开发说明

### 添加新的文件类型支持

在 `server.js` 中修改 `allowedTypes` 数组：

```javascript
const allowedTypes = [
  // 添加新的MIME类型
  'application/your-mime-type'
];
```

### 修改主题样式

在 `style.css` 中修改CSS变量和主题相关样式。

### 添加新的语言支持

在 `script.js` 和 `edit.js` 中的 `translations` 对象添加新的语言包。

## 许可证

MIT License