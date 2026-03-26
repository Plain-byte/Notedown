# Notedown 后端服务器

## AI服务配置说明

### 后端API配置
后端服务器已经正确配置了AI服务的接口地址：

- **智谱AI (Zhipu)**: `https://open.bigmodel.cn/api/paas/v4/`
- **OpenAI**: `https://api.openai.com/v1`

### 配置步骤

1. **安装依赖包**
   ```bash
   cd server
   npm install
   ```

2. **配置API密钥**
   - 复制 `.env.example` 文件并重命名为 `.env`
   - 编辑 `.env` 文件，设置您的API密钥：
     ```
     # AI API密钥（支持OpenAI和智谱AI）
     AI_API_KEY=your_api_key_here
     
     # 默认AI服务提供商（openai 或 zhipu）
     DEFAULT_AI_PROVIDER=zhipu
     ```

3. **启动服务器**
   ```bash
   npm start
   ```

### 支持的AI服务商

- **智谱AI (Zhipu)** - 使用GLM-4模型
- **OpenAI** - 使用GPT-3.5-Turbo模型

### 认证方式

后端已经正确处理了不同AI服务商的认证方式：
- **OpenAI**: 使用标准的Bearer Token认证
- **智谱AI**: 使用时间戳签名认证

### 注意事项

1. API密钥配置在后端更安全，避免前端暴露敏感信息
2. 默认使用智谱AI服务，如需切换可在 `.env` 文件中修改
3. 请确保您的API密钥有足够的余额和权限
4. 服务器启动后，前端会自动连接到正确的AI服务