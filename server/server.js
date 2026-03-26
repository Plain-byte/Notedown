const express = require('express');
const mysql = require('mysql');
const multer = require('multer');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const crypto = require('crypto');

// 加载环境变量
require('dotenv').config();

const app = express();

// 中间件配置
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 创建文件上传目录 - 使用D盘
const uploadDir = 'D:/notedown/uploads';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// 静态文件服务 - 提供上传的文件访问
app.use('/uploads', express.static(uploadDir));

// 数据库连接配置
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '780219', // 请根据您的MySQL密码修改
  database: 'notedown',
  charset: 'utf8mb4'
});

// 连接数据库
db.connect((err) => {
  if (err) {
    console.error('数据库连接失败:', err);
    console.log('请确保MySQL服务已启动，并且已创建notedown数据库');
    return;
  }
  console.log('数据库连接成功');
  
  // 创建笔记表
  db.query(`
    CREATE TABLE IF NOT EXISTS notes (
      id INT AUTO_INCREMENT PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      category VARCHAR(100),
      content TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `, (err) => {
    if (err) {
      console.error('创建笔记表失败:', err);
    } else {
      console.log('笔记表创建/检查成功');
    }
  });
  
  // 创建文件表
  db.query(`
    CREATE TABLE IF NOT EXISTS files (
      id INT AUTO_INCREMENT PRIMARY KEY,
      note_id INT,
      name VARCHAR(255) NOT NULL,
      type VARCHAR(100),
      path VARCHAR(255) NOT NULL,
      FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE
    )
  `, (err) => {
    if (err) {
      console.error('创建文件表失败:', err);
    } else {
      console.log('文件表创建/检查成功');
    }
  });
});

// 文件上传配置
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // 使用时间戳和原始文件名确保唯一性，正确处理中文编码
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    // 尝试多种编码方式处理中文文件名
    let originalName = file.originalname;
    try {
      // 先尝试从latin1转utf8
      if (/[^\x00-\x7F]/.test(file.originalname)) {
        originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');
      }
    } catch (e) {
      console.log('文件名编码转换失败，使用原始名称:', file.originalname);
    }
    cb(null, uniqueSuffix + '-' + originalName);
  }
});

const upload = multer({ 
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 限制文件大小为10MB
  },
  fileFilter: (req, file, cb) => {
    // 允许的文件类型
    const allowedTypes = [
      'image/jpeg', 'image/jpg', 'image/png', 'image/gif',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/markdown',
      'text/plain',
      'text/x-markdown',
      'application/octet-stream' // 通用类型
    ];
    
    // 也允许常见的文件扩展名
    const allowedExtensions = ['.md', '.txt', '.markdown', '.mdx'];
    const fileExtension = path.extname(file.originalname).toLowerCase();
    
    console.log('文件上传信息:', {
      name: file.originalname,
      mimetype: file.mimetype,
      extension: fileExtension
    });
    
    if (allowedTypes.includes(file.mimetype) || allowedExtensions.includes(fileExtension)) {
      cb(null, true);
    } else {
      cb(new Error(`不支持的文件类型: ${file.mimetype} (${file.originalname})`), false);
    }
  }
});

// API路由

// 获取所有笔记
app.get('/api/notes', (req, res) => {
  db.query('SELECT * FROM notes ORDER BY updated_at DESC', (err, results) => {
    if (err) {
      console.error('获取笔记失败:', err);
      res.status(500).json({ error: '获取笔记失败' });
      return;
    }
    
    // 为每个笔记获取关联的文件
    const notesWithFiles = results.map(note => {
      return new Promise((resolve, reject) => {
        db.query('SELECT * FROM files WHERE note_id = ?', [note.id], (err, files) => {
          if (err) {
            reject(err);
          } else {
            resolve({ ...note, files });
          }
        });
      });
    });
    
    Promise.all(notesWithFiles)
      .then(notes => res.json(notes))
      .catch(error => {
        console.error('获取笔记文件失败:', error);
        res.status(500).json({ error: '获取笔记文件失败' });
      });
  });
});

// 获取单个笔记
app.get('/api/notes/:id', (req, res) => {
  const id = req.params.id;
  
  db.query('SELECT * FROM notes WHERE id = ?', [id], (err, results) => {
    if (err) {
      console.error('获取笔记失败:', err);
      res.status(500).json({ error: '获取笔记失败' });
      return;
    }
    
    if (results.length === 0) {
      res.status(404).json({ error: '笔记不存在' });
      return;
    }
    
    const note = results[0];
    
    // 获取笔记关联的文件
    db.query('SELECT * FROM files WHERE note_id = ?', [id], (err, files) => {
      if (err) {
        console.error('获取笔记文件失败:', err);
        res.status(500).json({ error: '获取笔记文件失败' });
        return;
      }
      
      note.files = files;
      res.json(note);
    });
  });
});

// 创建新笔记
app.post('/api/notes', upload.array('files'), (req, res) => {
  const { title, category, content } = req.body;
  
  if (!title || title.trim() === '') {
    res.status(400).json({ error: '笔记标题不能为空' });
    return;
  }
  
  db.query(
    'INSERT INTO notes (title, category, content) VALUES (?, ?, ?)',
    [title.trim(), category || '', content || ''],
    (err, result) => {
      if (err) {
        console.error('创建笔记失败:', err);
        res.status(500).json({ error: '创建笔记失败' });
        return;
      }
      
      const noteId = result.insertId;
      
      // 处理上传的文件
      if (req.files && req.files.length > 0) {
        const filePromises = req.files.map(file => {
          return new Promise((resolve, reject) => {
            // 正确处理中文文件名编码
            let fileName = file.originalname;
            try {
              // 先尝试从latin1转utf8
              if (/[^\x00-\x7F]/.test(file.originalname)) {
                fileName = Buffer.from(file.originalname, 'latin1').toString('utf8');
              }
            } catch (e) {
              console.log('数据库文件名编码转换失败，使用原始名称:', file.originalname);
            }
            db.query(
              'INSERT INTO files (note_id, name, type, path) VALUES (?, ?, ?, ?)',
              [noteId, fileName, file.mimetype, file.filename],
              (err) => {
                if (err) reject(err);
                else resolve();
              }
            );
          });
        });
        
        Promise.all(filePromises)
          .then(() => {
            res.json({ 
              id: noteId, 
              title: title.trim(), 
              category: category || '', 
              content: content || '',
              message: '笔记创建成功'
            });
          })
          .catch(error => {
            console.error('保存文件信息失败:', error);
            res.status(500).json({ error: '保存文件信息失败' });
          });
      } else {
        res.json({ 
          id: noteId, 
          title: title.trim(), 
          category: category || '', 
          content: content || '',
          message: '笔记创建成功'
        });
      }
    }
  );
});

// 更新笔记
app.put('/api/notes/:id', upload.array('files'), (req, res) => {
  const id = req.params.id;
  const { title, category, content, deletedFiles } = req.body;
  
  if (!title || title.trim() === '') {
    res.status(400).json({ error: '笔记标题不能为空' });
    return;
  }
  
  db.query(
    'UPDATE notes SET title = ?, category = ?, content = ? WHERE id = ?',
    [title.trim(), category || '', content || '', id],
    (err, result) => {
      if (err) {
        console.error('更新笔记失败:', err);
        res.status(500).json({ error: '更新笔记失败' });
        return;
      }
      
      if (result.affectedRows === 0) {
        res.status(404).json({ error: '笔记不存在' });
        return;
      }
      
      // 删除已标记为删除的文件
      if (deletedFiles) {
        try {
          const deletedFileIds = JSON.parse(deletedFiles);
          if (Array.isArray(deletedFileIds) && deletedFileIds.length > 0) {
            const deletePromises = deletedFileIds.map(fileId => {
              return new Promise((resolve, reject) => {
                // 先获取文件路径，以便删除物理文件
                db.query('SELECT * FROM files WHERE id = ?', [fileId], (err, results) => {
                  if (err) {
                    reject(err);
                    return;
                  }
                  
                  if (results.length > 0) {
                    const file = results[0];
                    // 删除物理文件
                    fs.unlink(file.path, (err) => {
                      if (err) {
                        console.log('删除物理文件失败:', err);
                      }
                    });
                  }
                  
                  // 从数据库删除文件记录
                  db.query('DELETE FROM files WHERE id = ?', [fileId], (err) => {
                    if (err) reject(err);
                    else resolve();
                  });
                });
              });
            });
            
            Promise.all(deletePromises).catch(error => {
              console.error('删除文件失败:', error);
            });
          }
        } catch (e) {
          console.log('解析删除文件列表失败:', e);
        }
      }
      
      // 处理新上传的文件
      if (req.files && req.files.length > 0) {
        const filePromises = req.files.map(file => {
          return new Promise((resolve, reject) => {
            // 正确处理中文文件名编码
            let fileName = file.originalname;
            try {
              // 先尝试从latin1转utf8
              if (/[^\x00-\x7F]/.test(file.originalname)) {
                fileName = Buffer.from(file.originalname, 'latin1').toString('utf8');
              }
            } catch (e) {
              console.log('数据库文件名编码转换失败，使用原始名称:', file.originalname);
            }
            
            db.query(
              'INSERT INTO files (note_id, name, type, path) VALUES (?, ?, ?, ?)',
              [id, fileName, file.mimetype, file.filename],
              (err) => {
                if (err) reject(err);
                else resolve();
              }
            );
          });
        });
        
        Promise.all(filePromises)
          .then(() => {
            res.json({ 
              id, 
              title: title.trim(), 
              category: category || '', 
              content: content || '',
              message: '笔记更新成功'
            });
          })
          .catch(error => {
            console.error('保存新文件失败:', error);
            res.status(500).json({ error: '保存新文件失败' });
          });
      } else {
        res.json({ 
          id, 
          title: title.trim(), 
          category: category || '', 
          content: content || '',
          message: '笔记更新成功'
        });
      }
    }
  );
});

// 删除笔记
app.delete('/api/notes/:id', (req, res) => {
  const id = req.params.id;
  
  // 删除笔记（级联删除相关文件）
  db.query('DELETE FROM notes WHERE id = ?', [id], (err, result) => {
    if (err) {
      console.error('删除笔记失败:', err);
      res.status(500).json({ error: '删除笔记失败' });
      return;
    }
    
    if (result.affectedRows === 0) {
      res.status(404).json({ error: '笔记不存在' });
      return;
    }
    
    res.json({ message: '笔记删除成功' });
  });
});

// 获取文件信息
app.get('/api/files/:id', (req, res) => {
  const id = req.params.id;
  db.query('SELECT * FROM files WHERE id = ?', [id], (err, results) => {
    if (err) {
      console.error('获取文件信息失败:', err);
      res.status(500).json({ error: '获取文件信息失败' });
      return;
    }
    
    if (results.length === 0) {
      res.status(404).json({ error: '文件不存在' });
      return;
    }
    
    res.json(results[0]);
  });
});

// 错误处理中间件
app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      res.status(400).json({ error: '文件大小超过限制（10MB）' });
    } else {
      res.status(400).json({ error: '文件上传错误' });
    }
  } else {
    res.status(500).json({ error: error.message || '服务器内部错误' });
  }
});

// AI聊天相关接口

// 聊天会话配置
const AI_CONFIG = {
  // 用户需要配置自己的API密钥
  apiKey: process.env.AI_API_KEY || '',
  // 支持的AI服务提供商
  providers: {
    openai: {
      baseURL: 'https://api.openai.com/v1',
      model: 'gpt-3.5-turbo',
      authType: 'bearer'
    },
    zhipu: {
      baseURL: 'https://open.bigmodel.cn/api/paas/v4',
      model: 'glm-4',
      authType: 'bearer'
    }
  },
  // 默认使用智谱AI
  defaultProvider: process.env.DEFAULT_AI_PROVIDER || 'zhipu'
};

// 生成随机字符串（Nonce）
function generateNonce(length = 16) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let nonce = '';
  for (let i = 0; i < length; i++) {
    nonce += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return nonce;
}

// 生成智谱AI认证头部（适配accessKey.secretKey格式）
async function generateZhipuAuthHeader(apiKey, method, path, body) {
  try {
    // 1. 拆分accessKey和secretKey（核心适配你的API Key格式）
    const [accessKey, secretKey] = apiKey.split('.');
    if (!accessKey || !secretKey) {
      throw new Error('API Key格式错误，应为accessKey.secretKey格式');
    }

    // 2. 生成时间戳（秒级）
    const timestamp = Math.floor(Date.now() / 1000);
    
    // 3. 生成随机串（Nonce）
    const nonce = generateNonce(16);
    
    // 4. 处理请求体（去除所有空格，确保签名一致性）
    let bodyStr = '';
    if (body) {
      bodyStr = JSON.stringify(body).replace(/\s/g, '');
      console.log('原始JSON字符串（去空格）:', bodyStr.substring(0, Math.min(100, bodyStr.length)) + '...');
    }
    
    // 5. 拼接待签名字符串（智谱AI官方签名算法）
    // 格式：timestamp + nonce + method + path + body（所有参数去空格）
    const signStr = `${timestamp}${nonce}${method.toUpperCase()}${path}${bodyStr}`;
    
    // 调试日志
    console.log('智谱AI签名调试信息:');
    console.log('API Key (前10位):', apiKey.substring(0, Math.min(10, apiKey.length)) + '...');
    console.log('Access Key:', accessKey);
    console.log('Secret Key (前5位):', secretKey.substring(0, Math.min(5, secretKey.length)) + '...');
    console.log('Method:', method);
    console.log('Path:', path);
    console.log('Timestamp:', timestamp);
    console.log('Nonce:', nonce);
    console.log('Body Str (去空格，前100位):', bodyStr ? (bodyStr.substring(0, Math.min(100, bodyStr.length)) + '...') : '[空]');
    console.log('Sign Str (完整):', signStr);
    
    // 6. HMAC-SHA256签名计算
    const signature = crypto.createHmac('sha256', secretKey)
      .update(signStr)
      .digest('base64');
    
    console.log('Signature:', signature);
    console.log('Authorization Header:', `ZhipuAI ${accessKey}:${signature}`);
    
    // 7. 返回认证头信息
    return {
      headers: {
        'Content-Type': 'application/json',
        'Timestamp': timestamp.toString(),
        'Nonce': nonce,
        'Authorization': `ZhipuAI ${accessKey}:${signature}`
      }
    };
    
  } catch (error) {
    console.error('智谱AI签名生成失败:', error);
    throw new Error('智谱AI认证签名失败: ' + error.message);
  }
}

// 验证AI配置
function validateAIConfig() {
  console.log('AI配置验证:');
  console.log('API Key 配置:', AI_CONFIG.apiKey ? '已配置' : '未配置');
  console.log('API Key 前10位:', AI_CONFIG.apiKey ? AI_CONFIG.apiKey.substring(0, Math.min(10, AI_CONFIG.apiKey.length)) + '...' : '无');
  console.log('默认服务商:', AI_CONFIG.defaultProvider);
  
  if (!AI_CONFIG.apiKey) {
    return { valid: false, message: '请配置AI API密钥' };
  }
  return { valid: true };
}

// AI聊天接口
app.post('/api/ai/chat', async (req, res) => {
  const { message, conversationId, provider = AI_CONFIG.defaultProvider } = req.body;
  
  // 验证配置
  console.log('AI聊天请求:', { message, conversationId, provider });
  const configValidation = validateAIConfig();
  if (!configValidation.valid) {
    return res.status(400).json({ error: configValidation.message });
  }
  
  if (!message) {
    return res.status(400).json({ error: '消息内容不能为空' });
  }
  
  try {
    const aiProvider = AI_CONFIG.providers[provider];
    if (!aiProvider) {
      return res.status(400).json({ error: '不支持的AI服务提供商' });
    }
    
    // 构建请求数据
    const requestData = {
      model: aiProvider.model,
      messages: [
        {
          role: 'system',
          content: '你是一个专业的笔记助手，帮助用户整理、分析、总结笔记内容。请提供清晰、有用的建议。'
        },
        {
          role: 'user',
          content: message
        }
      ],
      max_tokens: 1000,
      temperature: 0.7
    };
    
    // 准备请求头
    let headers = {
      'Content-Type': 'application/json'
    };
    
    // 根据服务提供商设置认证方式
    if (provider === 'zhipu') {
      // 智谱AI V4 API认证 - 尝试多种格式
      console.log('智谱AI认证调试:');
      console.log('API Key 格式:', AI_CONFIG.apiKey.includes('.') ? 'accessKey.secretKey' : '简单密钥');
      
      // 尝试方案1: Bearer Token (完整API密钥)
      const bearerTokenFull = `Bearer ${AI_CONFIG.apiKey}`;
      
      // 尝试方案2: 如果API密钥包含点号，尝试只使用accessKey部分
      let bearerTokenAccessKey = '';
      if (AI_CONFIG.apiKey.includes('.')) {
        const accessKey = AI_CONFIG.apiKey.split('.')[0];
        bearerTokenAccessKey = `Bearer ${accessKey}`;
      }
      
      // 优先使用完整API密钥
      headers['Authorization'] = bearerTokenFull;
      console.log('使用认证头 (方案1 - 完整密钥):', bearerTokenFull.substring(0, 50) + '...');
      
      // 如果需要，可以尝试方案2
      // headers['Authorization'] = bearerTokenAccessKey;
      
      // 记录完整的请求信息用于调试
      console.log('请求URL:', `${aiProvider.baseURL}/chat/completions`);
      console.log('请求头:', JSON.stringify(headers, null, 2));
    } else {
      headers['Authorization'] = `Bearer ${AI_CONFIG.apiKey}`;
    }
    
    // 发送请求到AI服务
    console.log('发送请求到智谱AI API...');
    const response = await axios.post(
      `${aiProvider.baseURL}/chat/completions`,
      requestData,
      { headers }
    );
    
    const aiResponse = response.data.choices[0].message.content;
    
    res.json({
      success: true,
      response: aiResponse,
      conversationId: conversationId || generateConversationId(),
      provider: provider
    });
    
  } catch (error) {
    console.error('AI聊天接口错误:', error.response?.data || error.message);
    res.status(500).json({ 
      error: 'AI服务调用失败',
      details: error.response?.data?.error?.message || error.message
    });
  }
});

// 笔记内容分析接口
app.post('/api/ai/analyze-note', async (req, res) => {
  const { title, content, category } = req.body;
  
  const configValidation = validateAIConfig();
  if (!configValidation.valid) {
    return res.status(400).json({ error: configValidation.message });
  }
  
  if (!title && !content) {
    return res.status(400).json({ error: '笔记标题或内容不能为空' });
  }
  
  try {
    const aiProvider = AI_CONFIG.providers[AI_CONFIG.defaultProvider];
    
    const analysisPrompt = `请分析以下笔记内容：
标题: ${title || '无'}
分类: ${category || '未分类'}
内容: ${content || '无'}

请提供以下分析：
1. 内容总结
2. 关键词提取
3. 分类建议（工作/学习/生活/其他）
4. 改进建议`;
    
    const requestData = {
      model: aiProvider.model,
      messages: [
        {
          role: 'system',
          content: '你是一个专业的笔记分析助手，擅长内容总结、关键词提取和分类建议。'
        },
        {
          role: 'user',
          content: analysisPrompt
        }
      ],
      max_tokens: 800,
      temperature: 0.5
    };
    
    // 准备请求头
    const headers = {
      'Content-Type': 'application/json'
    };
    
    // 根据服务提供商设置认证方式
    if (AI_CONFIG.defaultProvider === 'zhipu') {
      // 智谱AI V4 API认证 - 尝试多种格式
      console.log('智谱AI认证调试 (笔记分析):');
      console.log('API Key 格式:', AI_CONFIG.apiKey.includes('.') ? 'accessKey.secretKey' : '简单密钥');
      
      // 尝试方案1: Bearer Token (完整API密钥)
      const bearerTokenFull = `Bearer ${AI_CONFIG.apiKey}`;
      
      // 尝试方案2: 如果API密钥包含点号，尝试只使用accessKey部分
      let bearerTokenAccessKey = '';
      if (AI_CONFIG.apiKey.includes('.')) {
        const accessKey = AI_CONFIG.apiKey.split('.')[0];
        bearerTokenAccessKey = `Bearer ${accessKey}`;
      }
      
      // 优先使用完整API密钥
      headers['Authorization'] = bearerTokenFull;
      console.log('使用认证头 (方案1 - 完整密钥):', bearerTokenFull.substring(0, 50) + '...');
      
      // 记录完整的请求信息用于调试
      console.log('请求URL:', `${aiProvider.baseURL}/chat/completions`);
      console.log('请求体大小:', JSON.stringify(requestData).length, '字符');
    } else {
      headers['Authorization'] = `Bearer ${AI_CONFIG.apiKey}`;
    }
    
    console.log('发送笔记分析请求到智谱AI API...');
    const response = await axios.post(
      `${aiProvider.baseURL}/chat/completions`,
      requestData,
      { headers }
    );
    
    const analysisResult = response.data.choices[0].message.content;
    
    res.json({
      success: true,
      analysis: analysisResult
    });
    
  } catch (error) {
    console.error('笔记分析接口错误:', error);
    res.status(500).json({ 
      error: '笔记分析失败',
      details: error.response?.data?.error?.message || error.message
    });
  }
});

// 生成对话ID
function generateConversationId() {
  return 'conv_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// 获取AI配置信息
app.get('/api/ai/config', (req, res) => {
  const configValidation = validateAIConfig();
  res.json({
    configured: configValidation.valid,
    providers: Object.keys(AI_CONFIG.providers),
    defaultProvider: AI_CONFIG.defaultProvider
  });
});

// 保存AI配置到数据库
app.post('/api/ai/config', (req, res) => {
  const { apiKey, provider } = req.body;
  
  if (!apiKey || !provider) {
    return res.status(400).json({ error: 'API密钥和服务提供商不能为空' });
  }
  
  // 验证服务提供商
  if (!AI_CONFIG.providers[provider]) {
    return res.status(400).json({ error: '不支持的AI服务提供商' });
  }
  
  // 创建AI配置表
  db.query(`
    CREATE TABLE IF NOT EXISTS ai_config (
      id INT AUTO_INCREMENT PRIMARY KEY,
      api_key VARCHAR(255) NOT NULL,
      provider VARCHAR(50) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `, (err) => {
    if (err) {
      console.error('创建AI配置表失败:', err);
      return res.status(500).json({ error: '配置保存失败' });
    }
    
    // 检查是否已有配置
    db.query('SELECT * FROM ai_config LIMIT 1', (err, results) => {
      if (err) {
        console.error('查询AI配置失败:', err);
        return res.status(500).json({ error: '配置保存失败' });
      }
      
      if (results.length > 0) {
        // 更新现有配置
        db.query('UPDATE ai_config SET api_key = ?, provider = ? WHERE id = ?', 
          [apiKey, provider, results[0].id], (err) => {
            if (err) {
              console.error('更新AI配置失败:', err);
              return res.status(500).json({ error: '配置保存失败' });
            }
            res.json({ success: true, message: 'AI配置已更新，请重启服务器生效' });
          });
      } else {
        // 插入新配置
        db.query('INSERT INTO ai_config (api_key, provider) VALUES (?, ?)', 
          [apiKey, provider], (err, result) => {
            if (err) {
              console.error('插入AI配置失败:', err);
              return res.status(500).json({ error: '配置保存失败' });
            }
            res.json({ success: true, message: 'AI配置已保存，请重启服务器生效' });
          });
      }
    });
  });
});

// 从数据库加载AI配置
function loadAIConfigFromDB() {
  db.query('SELECT * FROM ai_config LIMIT 1', (err, results) => {
    if (err) {
      console.error('加载AI配置失败:', err);
      return;
    }
    
    if (results.length > 0) {
      const config = results[0];
      // 更新内存中的配置
      AI_CONFIG.apiKey = config.api_key;
      AI_CONFIG.defaultProvider = config.provider;
      console.log('AI配置已从数据库加载:');
      console.log('  API Key (前10位):', config.api_key.substring(0, Math.min(10, config.api_key.length)) + '...');
      console.log('  Provider:', config.provider);
      console.log('  配置时间:', config.created_at);
    } else {
      console.log('数据库中没有AI配置，使用环境变量配置');
    }
  });
}

// 启动时从数据库加载配置
loadAIConfigFromDB();

// AI认证调试端点
app.get('/api/ai/debug-auth', async (req, res) => {
  try {
    const testData = {
      model: 'glm-4',
      messages: [
        {
          role: 'system',
          content: '测试消息'
        },
        {
          role: 'user',
          content: '你好'
        }
      ],
      max_tokens: 100,
      temperature: 0.7
    };
    
    // 显示Bearer Token认证信息
    const bearerToken = `Bearer ${AI_CONFIG.apiKey}`;
    
    res.json({
      apiKeyPreview: AI_CONFIG.apiKey.substring(0, Math.min(20, AI_CONFIG.apiKey.length)) + '...',
      authenticationMethod: 'Bearer Token (智谱AI V4 API标准认证)',
      authorizationHeader: bearerToken,
      apiKeyFormat: AI_CONFIG.apiKey.includes('.') ? 'accessKey.secretKey格式' : '简单API密钥格式',
      note: '当前使用Bearer Token认证。访问 http://localhost:3001/api/ai/debug-auth 查看认证信息',
      testRequestData: testData
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 404处理
app.use((req, res) => {
  res.status(404).json({ error: '接口不存在' });
});

// 启动服务器
const PORT = process.env.PORT || 3001;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`服务器运行在 http://localhost:${PORT}`);
  console.log(`可通过 http://你的IP地址:${PORT} 在局域网访问`);
  console.log('请确保MySQL服务已启动，并且已创建notedown数据库');
});