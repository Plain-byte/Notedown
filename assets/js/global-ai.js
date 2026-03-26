// 全局AI助手功能
let globalAI;

class GlobalAI {
    constructor() {
        this.isInitialized = false;
        this.isSidebarVisible = false;
        this.currentConversationId = null;
        this.isGenerating = false; // 标记AI是否正在生成回答
        this.chatHistory = []; // 当前对话的聊天记录
        this.conversations = {}; // 所有对话记录
        this.showingConversationList = false; // 是否显示对话列表
        this.init();
    }

    init() {
        if (this.isInitialized) return;
        
        // 创建全局AI助手图标
        this.createAIIcon();
        
        // 创建AI侧边栏
        this.createAISidebar();
        
        // 绑定事件
        this.bindEvents();
        
        this.isInitialized = true;
        console.log('全局AI助手已初始化');
    }

    createAIIcon() {
        // AI图标已在HTML中直接添加，此方法不再需要
        return;
    }

    createAISidebar() {
        // 检查是否已存在AI侧边栏
        if (document.getElementById('global-ai-sidebar')) return;
        
        const sidebarHTML = `
            <div class="global-ai-sidebar" id="global-ai-sidebar">

                <div class="ai-sidebar-header" id="ai-sidebar-header">
                    <h3 data-lang="ai_assistant">AI笔记助手</h3>
                    <div class="header-actions">
                        <button class="new-chat-btn" onclick="globalAI.startNewConversation()" title="新话题">💬</button>
                        <button class="history-btn" onclick="globalAI.showConversationList()" title="对话记录">📋</button>
                        <button class="clear-chat-btn" onclick="globalAI.clearCurrentChat()" title="清空当前聊天记录">🗑️</button>
                        <button class="close-btn" onclick="globalAI.toggleSidebar()">×</button>
                    </div>
                </div>
                
                <div class="ai-sidebar-content">
                    <!-- 聊天消息区域 -->
                    <div class="ai-chat-messages" id="global-ai-chat-messages">
                        <div class="message assistant">
                            <div class="message-content">
你好！😄 我是你的AI笔记助手，很高兴为你服务！
我可以帮你：
- 分析和总结笔记内容 📝
- 提取关键词和重点 🔍
- 提供改进建议 💡
- 回答关于笔记管理的问题 ❓

有什么我可以帮你的吗？😊
                            </div>
                        </div>
                    </div>
                    
                    <!-- 聊天输入区域 -->
                    <div class="ai-chat-input">
                        <div class="input-container">
                            <div class="textarea-wrapper">
                                <textarea id="global-ai-chat-input" placeholder="输入你的问题..." data-lang="ai_placeholder" rows="3"></textarea>
                                <button class="btn btn-primary send-btn" onclick="globalAI.sendMessage()">▲</button>
                            </div>
                        </div>
                        <div class="quick-actions">
                                <button class="quick-btn" onclick="globalAI.quickAction('summarize')" data-lang="summarize">总结当前内容</button>
                            <button class="quick-btn" onclick="globalAI.quickAction('keywords')" data-lang="keywords">提取关键词</button>
                            <button class="quick-btn" onclick="globalAI.quickAction('improve')" data-lang="suggestions">改进建议</button>
                        </div>
                    </div>
                </div>
                
                <!-- 配置提示 -->
                <div class="config-prompt" id="global-ai-config-prompt">
                    <div class="prompt-content">
                        <button class="close-btn" onclick="globalAI.closeConfigPrompt()">×</button>
                        <h3>⚙️ 需要配置AI服务</h3>
                        <p>请先配置AI API密钥以使用智能聊天功能：</p>
                        <ol>
                            <li>点击右上角的设置按钮（⚙️）</li>
                            <li>在"AI设置"中输入您的API密钥</li>
                            <li>选择AI服务提供商</li>
                            <li>点击"保存配置"</li>
                        </ol>
                        <p><strong>支持的AI服务：</strong> OpenAI GPT-3.5/4、智谱AI GLM-4</p>
                        <div style="margin-top: 1rem; text-align: center;">
                            <button class="btn btn-secondary" onclick="globalAI.closeConfigPrompt()" style="margin-right: 0.5rem;">稍后配置</button>
                            <button class="btn btn-primary" onclick="globalAI.openSettings()">立即配置</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', sidebarHTML);
        
        // 创建自定义确认对话框
        this.createCustomConfirm();
        
        // 加载对话记录
        this.loadConversations();
        
        // 根据当前语言更新侧边栏文本
        const lang = localStorage.getItem('language') || 'zh-CN';
        if (typeof updateTranslations === 'function') {
            updateTranslations(lang);
        }
    }

    bindEvents() {
        // AI图标已经通过onclick属性绑定，这里不需要重复绑定
        // 只需要绑定其他事件
        
        // 输入框回车发送
        const chatInput = document.getElementById('global-ai-chat-input');
        chatInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });

        // 输入框高度自适应
        chatInput.addEventListener('input', () => {
            // 重置高度为auto，让浏览器计算实际需要的高度
            chatInput.style.height = 'auto';
            
            // 获取输入框的最大高度（30vh）
            const maxHeight = parseInt(getComputedStyle(chatInput).maxHeight);
            
            // 计算实际需要的高度
            const scrollHeight = chatInput.scrollHeight;
            
            // 比较实际高度和最大高度
            if (scrollHeight > maxHeight) {
                // 达到最大高度，显示滚动条
                chatInput.style.height = maxHeight + 'px';
                chatInput.style.overflowY = 'auto';
            } else {
                // 未达到最大高度，自适应高度，不显示滚动条
                chatInput.style.height = scrollHeight + 'px';
                chatInput.style.overflowY = 'hidden';
            }
        });

        // 调整发送按钮的位置，确保它始终在输入框的右下角
        function updateSendButtonPosition() {
            const sendBtn = document.querySelector('.send-btn');
            if (sendBtn) {
                const chatInput = document.getElementById('global-ai-chat-input');
                const inputHeight = chatInput.offsetHeight;
                sendBtn.style.bottom = '8px';
                sendBtn.style.right = '8px';
            }
        }

        // 监听输入框高度变化，更新发送按钮位置
        chatInput.addEventListener('input', updateSendButtonPosition);
        window.addEventListener('resize', updateSendButtonPosition);

        // 初始化发送按钮位置
        setTimeout(updateSendButtonPosition, 100);

        // 初始化输入框高度
        setTimeout(() => {
            chatInput.dispatchEvent(new Event('input'));
        }, 100);

        // 点击外部关闭侧边栏
        document.addEventListener('click', (e) => {
            const sidebar = document.getElementById('global-ai-sidebar');
            const icon = document.getElementById('global-ai-icon');
            
            if (this.isSidebarVisible && 
                !sidebar.contains(e.target) && 
                !icon.contains(e.target)) {
                this.hideSidebar();
            }
        });

        // ESC键关闭侧边栏
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isSidebarVisible) {
                this.hideSidebar();
            }
        });


    }



    toggleSidebar() {
        if (this.isSidebarVisible) {
            this.hideSidebar();
        } else {
            this.showSidebar();
        }
    }

    showSidebar() {
        const sidebar = document.getElementById('global-ai-sidebar');
        sidebar.classList.add('visible');
        this.isSidebarVisible = true;
        
        // 检查AI配置
        this.checkAIConfig();
        
        // 聚焦输入框
        setTimeout(() => {
            document.getElementById('global-ai-chat-input').focus();
        }, 300);
    }

    hideSidebar() {
        const sidebar = document.getElementById('global-ai-sidebar');
        sidebar.classList.remove('visible');
        this.isSidebarVisible = false;
    }

    checkAIConfig() {
        // 检查AI配置状态 - 修复API路径
        fetch('http://localhost:3001/api/ai/config')
            .then(response => response.json())
            .then(config => {
                const prompt = document.getElementById('global-ai-config-prompt');
                if (!config.configured) {
                    prompt.style.display = 'block';
                } else {
                    prompt.style.display = 'none';
                }
            })
            .catch(error => {
                console.error('检查AI配置失败:', error);
            });
    }

    closeConfigPrompt() {
        document.getElementById('global-ai-config-prompt').style.display = 'none';
    }

    openSettings() {
        // 打开设置菜单
        const settingsBtn = document.querySelector('.settings-btn');
        if (settingsBtn) {
            settingsBtn.click();
            this.hideSidebar();
        }
    }

    // 存储当前的fetch请求
    currentFetch = null;

    sendMessage() {
        // 如果AI正在生成，暂停生成
        if (this.isGenerating) {
            this.pauseGeneration();
            return;
        }

        const input = document.getElementById('global-ai-chat-input');
        const message = input.value.trim();
        
        if (!message) return;

        // 清空输入框
        input.value = '';
        
        // 添加用户消息
        this.addMessage('user', message);
        
        // 显示AI正在输入
        this.showTypingIndicator();
        
        // 切换按钮状态为暂停
        this.setSendButtonState('pause');
        this.isGenerating = true;
        
        // 创建AbortController用于取消请求
        const controller = new AbortController();
        const signal = controller.signal;
        this.currentFetch = { controller, signal };
        
        // 发送到AI服务 - 修复API路径
        fetch('http://localhost:3001/api/ai/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: message,
                conversationId: this.currentConversationId,
                provider: 'zhipu'
            }),
            signal: signal // 添加信号
        })
        .then(response => response.json())
        .then(data => {
            this.hideTypingIndicator();
            this.isGenerating = false;
            // 恢复按钮状态为发送
            this.setSendButtonState('send');
            this.currentFetch = null;
            
            if (data.success) {
                this.currentConversationId = data.conversationId;
                this.addMessage('assistant', data.response);
            } else {
                this.addMessage('error', `AI服务错误: ${data.error}`);
            }
        })
        .catch(error => {
            // 忽略取消请求的错误
            if (error.name !== 'AbortError') {
                this.hideTypingIndicator();
                this.isGenerating = false;
                // 恢复按钮状态为发送
                this.setSendButtonState('send');
                this.addMessage('error', `网络错误: ${error.message}`);
            }
            this.currentFetch = null;
        });
    }

    // 暂停AI生成
    pauseGeneration() {
        // 取消当前的fetch请求
        if (this.currentFetch) {
            this.currentFetch.controller.abort();
            this.currentFetch = null;
        }
        
        this.isGenerating = false;
        this.hideTypingIndicator();
        this.setSendButtonState('send');
        this.addMessage('assistant', '生成已暂停');
    }

    // 设置发送按钮状态
    setSendButtonState(state) {
        const sendBtn = document.querySelector('.send-btn');
        if (sendBtn) {
            if (state === 'pause') {
                sendBtn.textContent = '⚪';
                sendBtn.title = '暂停生成';
            } else {
                sendBtn.textContent = '▲';
                sendBtn.title = '发送';
            }
        }
    }

    quickAction(action) {
        let message = '';
        
        switch (action) {
            case 'summarize':
                message = this.getCurrentContent() + '\n\n请帮我总结这段内容。';
                break;
            case 'keywords':
                message = this.getCurrentContent() + '\n\n请提取这段内容的关键词。';
                break;
            case 'improve':
                message = this.getCurrentContent() + '\n\n请提供改进建议。';
                break;
            default:
                return;
        }
        
        document.getElementById('global-ai-chat-input').value = message;
        this.sendMessage();
    }

    getCurrentContent() {
        // 根据当前页面获取内容
        const currentPath = window.location.pathname;
        
        if (currentPath.includes('edit.html')) {
            // 编辑页面：获取笔记内容
            const content = document.getElementById('note-content')?.value || '';
            const title = document.getElementById('note-title')?.value || '';
            return `标题：${title}\n内容：${content}`;
        } else if (currentPath.includes('category.html')) {
            // 分类页面：获取当前分类名称
            const category = document.getElementById('category-title')?.textContent || '';
            return `我正在查看"${category}"分类的笔记`;
        } else {
            // 主页：获取当前筛选条件
            const activeTab = document.querySelector('.tab-btn.active')?.dataset.category || '全部';
            return `我正在查看"${activeTab}"分类的笔记列表`;
        }
    }

    addMessage(role, content) {
        const messagesContainer = document.getElementById('global-ai-chat-messages');
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${role}`;
        
        const messageContent = document.createElement('div');
        messageContent.className = 'message-content';
        
        let displayContent = content;
        
        if (role === 'user') {
            messageContent.innerHTML = `${content}`;
        } else if (role === 'assistant') {
            // 简化AI回答格式，移除过多的Markdown符号
            displayContent = content
                .replace(/\*\*(.*?)\*\*/g, '$1') // 移除加粗
                .replace(/\#\#\#\#\s+(.*?)\n/g, '$1\n') // 移除四级标题
                .replace(/\#\#\#\s+(.*?)\n/g, '$1\n') // 移除三级标题
                .replace(/\#\#\s+(.*?)\n/g, '$1\n') // 移除二级标题
                .replace(/\#\s+(.*?)\n/g, '$1\n') // 移除一级标题
                .replace(/\-\s/g, '· ') // 将破折号改为点号
                .replace(/\n\n\n+/g, '\n\n') // 减少过多的空行
                .replace(/\n\s+\n/g, '\n\n'); // 清理行间空格
            
            messageContent.innerHTML = displayContent;
        } else {
            messageContent.innerHTML = `${content}`;
        }
        
        messageDiv.appendChild(messageContent);
        messagesContainer.appendChild(messageDiv);
        
        // 保存消息到聊天记录（排除错误和暂停消息）
        if (role === 'user' || role === 'assistant') {
            // 如果是第一条用户消息，创建新对话
            if (role === 'user' && this.chatHistory.length === 0 && !this.currentConversationId) {
                this.currentConversationId = this.generateConversationId();
            }
            
            this.chatHistory.push({
                role: role,
                content: content,
                timestamp: Date.now()
            });
            
            // 保存到对话记录
            this.saveCurrentConversation();
        }
        
        // 滚动到底部
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    showTypingIndicator() {
        const messagesContainer = document.getElementById('global-ai-chat-messages');
        const typingDiv = document.createElement('div');
        typingDiv.id = 'ai-typing-indicator';
        typingDiv.className = 'message assistant typing';
        typingDiv.innerHTML = `
            <div class="message-content">
                <span class="typing-dots">
                    <span>.</span><span>.</span><span>.</span>
                </span>
            </div>
        `;
        messagesContainer.appendChild(typingDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    hideTypingIndicator() {
        const typingIndicator = document.getElementById('ai-typing-indicator');
        if (typingIndicator) {
            typingIndicator.remove();
        }
    }

    // 生成对话ID
    generateConversationId() {
        return 'conversation_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    // 生成对话标题（基于第一条用户消息）
    generateConversationTitle(userMessage) {
        const maxLength = 30;
        let title = userMessage.trim();
        
        if (title.length > maxLength) {
            title = title.substring(0, maxLength) + '...';
        }
        
        return title || '新对话';
    }

    // 保存对话记录到localStorage
    saveConversations() {
        try {
            const data = {
                currentConversationId: this.currentConversationId,
                conversations: this.conversations
            };
            localStorage.setItem('global_ai_conversations', JSON.stringify(data));
        } catch (error) {
            console.error('保存对话记录失败:', error);
        }
    }

    // 从localStorage加载对话记录
    loadConversations() {
        try {
            const savedData = localStorage.getItem('global_ai_conversations');
            if (savedData) {
                const data = JSON.parse(savedData);
                this.currentConversationId = data.currentConversationId;
                this.conversations = data.conversations || {};
                
                // 加载当前对话的聊天记录
                if (this.currentConversationId && this.conversations[this.currentConversationId]) {
                    this.chatHistory = this.conversations[this.currentConversationId].messages || [];
                    this.renderChatHistory();
                }
            }
        } catch (error) {
            console.error('加载对话记录失败:', error);
            this.conversations = {};
            this.chatHistory = [];
        }
    }

    // 保存当前对话到对话列表
    saveCurrentConversation() {
        if (this.chatHistory.length > 0 && this.currentConversationId) {
            // 如果没有标题，基于第一条用户消息生成标题
            if (!this.conversations[this.currentConversationId]?.title) {
                const firstUserMessage = this.chatHistory.find(msg => msg.role === 'user');
                if (firstUserMessage) {
                    this.conversations[this.currentConversationId] = {
                        id: this.currentConversationId,
                        title: this.generateConversationTitle(firstUserMessage.content),
                        messages: [...this.chatHistory],
                        createdAt: Date.now(),
                        updatedAt: Date.now()
                    };
                }
            } else {
                // 更新现有对话
                this.conversations[this.currentConversationId].messages = [...this.chatHistory];
                this.conversations[this.currentConversationId].updatedAt = Date.now();
            }
            
            this.saveConversations();
        }
    }

    // 渲染历史聊天记录到界面
    renderChatHistory() {
        const messagesContainer = document.getElementById('global-ai-chat-messages');
        if (!messagesContainer) return;
        
        // 清空消息容器
        messagesContainer.innerHTML = '';
        
        // 如果没有聊天记录，显示欢迎消息
        if (this.chatHistory.length === 0) {
            const welcomeMessage = document.createElement('div');
            welcomeMessage.className = 'message assistant';
            welcomeMessage.innerHTML = `
                <div class="message-content">
你好！😄 我是你的AI笔记助手，很高兴为你服务！
我可以帮你：
• 分析和总结笔记内容 📝
• 提取关键词和重点 🔍
• 提供改进建议 💡
• 回答关于笔记管理的问题 ❓<br>
有什么我可以帮你的吗？😊
                </div>
            `;
            messagesContainer.appendChild(welcomeMessage);
        } else {
            // 渲染历史消息
            this.chatHistory.forEach(message => {
                const messageDiv = document.createElement('div');
                messageDiv.className = `message ${message.role}`;
                
                const messageContent = document.createElement('div');
                messageContent.className = 'message-content';
                messageContent.innerHTML = message.content;
                
                messageDiv.appendChild(messageContent);
                messagesContainer.appendChild(messageDiv);
            });
        }
        
        // 滚动到底部
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    // 开启新话题
    startNewConversation() {
        // 保存当前对话
        this.saveCurrentConversation();
        
        // 重置当前对话
        this.currentConversationId = null;
        this.chatHistory = [];
        
        // 重新渲染界面，显示欢迎词
        this.renderChatHistory();
        
        // 聚焦输入框
        setTimeout(() => {
            document.getElementById('global-ai-chat-input').focus();
        }, 100);
    }

    // 清空当前聊天记录
    clearCurrentChat() {
        this.showCustomConfirm(this.getTranslation('clear_current_confirm'), (confirmed) => {
            if (confirmed) {
                this.chatHistory = [];
                this.currentConversationId = null;
                
                // 重新渲染界面，直接显示欢迎词
                this.renderChatHistory();
            }
        });
    }

    // 清空所有聊天记录
    clearAllChatHistory() {
        this.showCustomConfirm(this.getTranslation('clear_all_confirm'), (confirmed) => {
            if (confirmed) {
                this.chatHistory = [];
                this.currentConversationId = null;
                localStorage.removeItem('global_ai_conversations');
                this.conversations = {};
                
                // 如果当前在对话记录页面，重新渲染对话列表（显示"还没有对话记录"）
                if (this.showingConversationList) {
                    this.renderConversationList();
                } else {
                    // 如果不在对话记录页面，显示头部和输入区域，并渲染欢迎词
                    this.showHeader();
                    this.showChatInput();
                    this.renderChatHistory();
                }
            }
        });
    }

    // 显示对话列表
    showConversationList() {
        this.showingConversationList = true;
        this.renderConversationList();
        this.hideHeader();
        this.hideChatInput();
    }

    // 隐藏对话列表
    hideConversationList(event) {
        if (event) {
            event.stopPropagation();
        }
        this.showingConversationList = false;
        this.renderChatHistory();
        this.showHeader();
        this.showChatInput();
    }

    // 渲染对话列表
    renderConversationList() {
        const messagesContainer = document.getElementById('global-ai-chat-messages');
        if (!messagesContainer) return;
        
        messagesContainer.innerHTML = `
            <div class="conversation-list-header">
                <div class="header-left">
                    <h4>${this.getTranslation('conversation_list')}</h4>
                    ${Object.values(this.conversations).length > 0 ? 
                        `<span class="clear-all-text" onclick="globalAI.clearAllChatHistory()">${this.getTranslation('clear_all')}</span>` : 
                        ''
                    }
                </div>
                <button class="back-to-chat-btn" onclick="globalAI.hideConversationList(event)">${this.getTranslation('back_to_chat')}</button>
            </div>
            <div class="conversation-list">
                ${Object.values(this.conversations).length > 0 ? 
                    Object.values(this.conversations)
                        .sort((a, b) => b.updatedAt - a.updatedAt)
                        .map(conversation => `
                            <div class="conversation-item" onclick="globalAI.loadConversation('${conversation.id}', event)">
                                <div class="conversation-title">${conversation.title}</div>
                                <div class="conversation-meta">
                                    <span class="message-count">${conversation.messages.length}${this.getTranslation('message_count')}</span>
                                    <span class="update-time">${new Date(conversation.updatedAt).toLocaleString()}</span>
                                </div>
                                <button class="delete-conversation-btn" onclick="globalAI.deleteConversation('${conversation.id}', event)">${this.getTranslation('delete')}</button>
                            </div>
                        `).join('') : 
                    `<div class="no-conversations">${this.getTranslation('no_conversations')}</div>`
                }
            </div>
        `;
    }

    // 加载指定对话
    loadConversation(conversationId, event) {
        if (event) {
            event.stopPropagation();
        }
        if (this.conversations[conversationId]) {
            // 保存当前对话
            this.saveCurrentConversation();
            
            // 加载新对话
            this.currentConversationId = conversationId;
            this.chatHistory = [...this.conversations[conversationId].messages];
            this.showingConversationList = false;
            
            // 渲染聊天记录
            this.renderChatHistory();
            this.showHeader();
            this.showChatInput();
            
            // 聚焦输入框
            setTimeout(() => {
                document.getElementById('global-ai-chat-input').focus();
            }, 100);
        }
    }

    // 隐藏头部
    hideHeader() {
        const header = document.getElementById('ai-sidebar-header');
        if (header) {
            header.style.display = 'none';
        }
    }

    // 显示头部
    showHeader() {
        const header = document.getElementById('ai-sidebar-header');
        if (header) {
            header.style.display = 'flex';
        }
    }

    // 隐藏聊天输入区域
    hideChatInput() {
        const chatInput = document.querySelector('.ai-chat-input');
        if (chatInput) {
            chatInput.style.display = 'none';
        }
    }

    // 显示聊天输入区域
    showChatInput() {
        const chatInput = document.querySelector('.ai-chat-input');
        if (chatInput) {
            chatInput.style.display = 'block';
        }
    }

    // 创建自定义确认对话框
    createCustomConfirm() {
        if (document.getElementById('custom-confirm')) return;
        
        const lang = localStorage.getItem('language') || 'zh-CN';
        const cancelText = lang === 'en-GB' ? 'Cancel' : '取消';
        const confirmText = lang === 'en-GB' ? 'Confirm' : '确定';
        
        const confirmHTML = `
            <div class="custom-confirm" id="custom-confirm">
                <div class="confirm-content">
                    <p class="confirm-message" id="confirm-message"></p>
                    <div class="confirm-buttons">
                        <button class="confirm-btn cancel" id="confirm-cancel">${cancelText}</button>
                        <button class="confirm-btn confirm" id="confirm-ok">${confirmText}</button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', confirmHTML);
        
        // 绑定事件
        const confirmDialog = document.getElementById('custom-confirm');
        const cancelBtn = document.getElementById('confirm-cancel');
        const okBtn = document.getElementById('confirm-ok');
        
        cancelBtn.addEventListener('click', () => {
            this.hideCustomConfirm();
            if (this.confirmCallback) {
                this.confirmCallback(false);
                this.confirmCallback = null;
            }
        });
        
        okBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.hideCustomConfirm();
            if (this.confirmCallback) {
                this.confirmCallback(true);
                this.confirmCallback = null;
            }
        });
        
        cancelBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.hideCustomConfirm();
            if (this.confirmCallback) {
                this.confirmCallback(false);
                this.confirmCallback = null;
            }
        });
        
        confirmDialog.addEventListener('click', (e) => {
            e.stopPropagation();
            if (e.target === confirmDialog) {
                this.hideCustomConfirm();
                if (this.confirmCallback) {
                    this.confirmCallback(false);
                    this.confirmCallback = null;
                }
            }
        });
    }

    // 获取翻译
    getTranslation(key) {
        const lang = localStorage.getItem('language') || 'zh-CN';
        
        // 首先检查全局翻译对象
        if (window.translations && window.translations[lang] && window.translations[lang][key]) {
            return window.translations[lang][key];
        }
        
        // 提供完整的双语翻译
        const translations = {
            'zh-CN': {
                'clear_current_confirm': '确定要清空当前聊天记录吗？',
                'clear_all_confirm': '确定要清空所有聊天记录吗？',
                'delete_conversation_confirm': '确定要删除这个对话吗？',
                'conversation_list': '对话记录',
                'back_to_chat': '返回聊天',
                'clear_all': '一键清空',
                'no_conversations': '还没有对话记录',
                'message_count': ' 条消息',
                'delete': '删除'
            },
            'en-GB': {
                'clear_current_confirm': 'Are you sure you want to clear the current chat?',
                'clear_all_confirm': 'Are you sure you want to clear all chat history?',
                'delete_conversation_confirm': 'Are you sure you want to delete this conversation?',
                'conversation_list': 'Conversation History',
                'back_to_chat': 'Back to Chat',
                'clear_all': 'Clear All',
                'no_conversations': 'No conversations yet',
                'message_count': ' messages',
                'delete': 'Delete'
            }
        };
        
        return translations[lang]?.[key] || translations['zh-CN'][key] || key;
    }

    // 显示自定义确认对话框
    showCustomConfirm(message, callback) {
        const confirmDialog = document.getElementById('custom-confirm');
        const messageEl = document.getElementById('confirm-message');
        
        if (confirmDialog && messageEl) {
            messageEl.textContent = message;
            confirmDialog.classList.add('active');
            this.confirmCallback = callback;
        }
    }

    // 隐藏自定义确认对话框
    hideCustomConfirm() {
        const confirmDialog = document.getElementById('custom-confirm');
        if (confirmDialog) {
            confirmDialog.classList.remove('active');
        }
    }

    // 删除对话
    deleteConversation(conversationId, event) {
        event.stopPropagation();
        
        this.showCustomConfirm(this.getTranslation('delete_conversation_confirm'), (confirmed) => {
            if (confirmed) {
                delete this.conversations[conversationId];
                
                // 如果删除的是当前对话，重置
                if (this.currentConversationId === conversationId) {
                    this.currentConversationId = null;
                    this.chatHistory = [];
                    this.renderChatHistory();
                }
                
                // 重新渲染对话列表
                if (this.showingConversationList) {
                    this.renderConversationList();
                }
                
                this.saveConversations();
            }
        });
    }
}

// 在DOM加载完成后创建全局AI实例
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        globalAI = new GlobalAI();
        console.log('全局AI助手已初始化');
    });
} else {
    globalAI = new GlobalAI();
    console.log('全局AI助手已初始化');
}