/**
 * 笔记管理系统 - 核心功能实现
 * 使用MySQL数据库存储笔记数据
 */

// 全局变量
let notes = [];
let filteredNotes = [];

// DOM元素
const notesContainer = document.getElementById('notes-container');
const emptyState = document.getElementById('empty-state');
const searchInput = document.getElementById('search-input');
const categoryFilter = document.getElementById('category-filter');
const categoryTabs = document.getElementById('category-tabs');

// API基础URL
const API_BASE_URL = 'http://localhost:3001/api';

// 初始化页面
function init() {
    // 从服务器加载笔记
    loadNotes();
    // 初始化搜索和筛选事件
    initEventListeners();
}

// 从服务器加载笔记
function loadNotes() {
    fetch(`${API_BASE_URL}/notes`)
        .then(response => {
            if (!response.ok) {
                throw new Error('网络响应不正常');
            }
            return response.json();
        })
        .then(data => {
            notes = data.map(note => ({
                ...note,
                // 兼容前端现有代码，添加必要的字段
                id: note.id.toString(),
                updatedAt: note.updated_at,
                createdAt: note.created_at
            }));
            filteredNotes = [...notes];
            renderNotes();
            generateCategoryNavigation();
        })
        .catch(error => {
            console.error('获取笔记失败:', error);
            notes = [];
            filteredNotes = [];
            renderNotes();
            // 显示错误提示
            showError('无法连接到服务器，请检查后端服务是否启动');
        });
}

// 显示错误信息
function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #ff4757;
        color: white;
        padding: 12px 16px;
        border-radius: 8px;
        z-index: 10000;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        max-width: 300px;
        word-wrap: break-word;
    `;
    errorDiv.textContent = message;
    document.body.appendChild(errorDiv);
    
    setTimeout(() => {
        errorDiv.remove();
    }, 5000);
}

// 渲染笔记列表
function renderNotes() {
    if (filteredNotes.length === 0) {
        notesContainer.innerHTML = '';
        emptyState.style.display = 'block';
        return;
    }

    emptyState.style.display = 'none';
    notesContainer.innerHTML = '';

    filteredNotes.forEach(note => {
        const noteCard = createNoteCard(note);
        notesContainer.appendChild(noteCard);
    });
}

// 创建笔记卡片
function createNoteCard(note) {
    const card = document.createElement('div');
    card.className = `note-card ${note.category || '未分类'}`;
    card.onclick = () => navigateToEdit(note.id);

    // 格式化日期
    const formattedDate = new Date(note.updatedAt).toLocaleString('zh-CN');
    
    // 获取当前语言
    const lang = localStorage.getItem('language') || 'zh-CN';
    
    // 获取翻译
    const deleteText = translations[lang]['delete'] || '删除';
    
    // 分类名称映射表
    const categoryMap = {
        '工作': 'work',
        '生活': 'life', 
        '学习': 'study',
        '其他': 'other',
        '未分类': 'uncategorized'
    };
    
    // 获取翻译后的分类名称
    let categoryText = note.category || '未分类';
    if (note.category) {
        const mappedCategory = categoryMap[note.category];
        if (mappedCategory && translations[lang][mappedCategory]) {
            categoryText = translations[lang][mappedCategory];
        }
    } else {
        categoryText = translations[lang]['uncategorized'] || '未分类';
    }

    card.innerHTML = `
                <h3>${note.title}</h3>
                <p>${note.content.replace(/<[^>]*>/g, '').substring(0, 100)}${note.content.length > 100 ? '...' : ''}</p>
                <div class="note-meta">
                    <span class="note-category">${categoryText}</span>
                    <span>${formattedDate}</span>
                </div>
            `;

    return card;
}

// 导航到编辑页面
function navigateToEdit(noteId) {
    window.location.href = `edit.html?id=${noteId}`;
}

// 全局变量，存储当前要删除的笔记ID
let currentNoteId = null;

// 删除笔记
function deleteNote(noteId) {
    currentNoteId = noteId;
    // 显示确认对话框
    const confirmDialog = document.getElementById('confirm-dialog');
    if (confirmDialog) {
        confirmDialog.classList.add('show');
    }
}

// 显示确认对话框
function showConfirmDialog(noteId) {
    currentNoteId = noteId;
    const confirmDialog = document.getElementById('confirm-dialog');
    if (confirmDialog) {
        confirmDialog.classList.add('show');
    }
}

// 确认删除
function confirmDelete() {
    if (currentNoteId) {
        fetch(`${API_BASE_URL}/notes/${currentNoteId}`, {
            method: 'DELETE'
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('删除失败');
            }
            return response.json();
        })
        .then(() => {
            // 重新加载笔记列表
            loadNotes();
            // 关闭确认对话框
            closeConfirmDialog();
        })
        .catch(error => {
            console.error('删除笔记失败:', error);
            alert('删除失败，请重试');
            closeConfirmDialog();
        });
    }
}

// 取消删除
function cancelDelete() {
    currentNoteId = null;
    // 关闭确认对话框
    closeConfirmDialog();
}

// 关闭确认对话框
function closeConfirmDialog() {
    const confirmDialog = document.getElementById('confirm-dialog');
    if (confirmDialog) {
        confirmDialog.classList.remove('show');
    }
}

// 初始化事件监听器
function initEventListeners() {
    // 搜索功能
    searchInput.addEventListener('input', handleSearch);
    // 横向导航栏
    initCategoryTabs();
}

// 处理搜索
function handleSearch() {
    const searchTerm = searchInput.value.toLowerCase();
    filterNotesBySearch(searchTerm);
}

// 过滤笔记（仅搜索功能）
function filterNotesBySearch(searchTerm) {
    filteredNotes = notes.filter(note => {
        const matchesSearch = note.title.toLowerCase().includes(searchTerm) || 
                            note.content.toLowerCase().includes(searchTerm);
        return matchesSearch;
    });
    renderNotes();
}

// 生成分类导航
function generateCategoryNavigation() {
    const categoriesNav = document.getElementById('categories-nav');
    if (!categoriesNav) return;
    
    // 获取所有唯一分类
    const categories = [...new Set(notes.map(note => note.category).filter(Boolean))];
    
    // 获取当前语言
    const lang = localStorage.getItem('language') || 'zh-CN';
    
    // 清空现有导航
    categoriesNav.innerHTML = '';
    
    // 为每个分类创建导航项
    categories.forEach(category => {
        const categoryItem = document.createElement('div');
        categoryItem.className = `category-item ${category}`;
        
        // 分类名称映射表
        const categoryMap = {
            '工作': 'work',
            '生活': 'life',
            '学习': 'study',
            '其他': 'other',
            '未分类': 'uncategorized'
        };
        
        // 获取翻译后的分类名称
        const mappedCategory = categoryMap[category] || category;
        const categoryText = translations[lang][mappedCategory] || category;
        
        // 计算该分类下的笔记数量
        const noteCount = notes.filter(note => note.category === category).length;
        
        categoryItem.innerHTML = `
            <div class="category-info">
                <h3>${categoryText}</h3>
                <span class="note-count">${noteCount} 篇笔记</span>
            </div>
            <button class="category-link" onclick="navigateToCategory('${category}')">查看全部</button>
        `;
        
        categoriesNav.appendChild(categoryItem);
    });
}

// 导航到分类页面
function navigateToCategory(category) {
    window.location.href = `category.html?category=${encodeURIComponent(category)}`;
}

// 初始化粒子效果
function initParticles() {
    particlesJS('particles-js', {
        particles: {
            number: {
                value: 80,
                density: {
                    enable: true,
                    value_area: 800
                }
            },
            color: {
                value: '#007AFF'
            },
            shape: {
                type: 'circle',
                stroke: {
                    width: 0,
                    color: '#000000'
                }
            },
            opacity: {
                value: 0.5,
                random: true,
                anim: {
                    enable: true,
                    speed: 1,
                    opacity_min: 0.1,
                    sync: false
                }
            },
            size: {
                value: 3,
                random: true,
                anim: {
                    enable: true,
                    speed: 2,
                    size_min: 0.1,
                    sync: false
                }
            },
            line_linked: {
                enable: true,
                distance: 150,
                color: '#007AFF',
                opacity: 0.4,
                width: 1
            },
            move: {
                enable: true,
                speed: 1,
                direction: 'none',
                random: false,
                straight: false,
                out_mode: 'out',
                bounce: false
            }
        },
        interactivity: {
            detect_on: 'canvas',
            events: {
                onhover: {
                    enable: true,
                    mode: 'grab'
                },
                onclick: {
                    enable: true,
                    mode: 'push'
                },
                resize: true
            },
            modes: {
                grab: {
                    distance: 140,
                    line_linked: {
                        opacity: 1
                    }
                },
                push: {
                    particles_nb: 4
                }
            }
        },
        retina_detect: true
    });
}

// 切换设置菜单显示/隐藏
function toggleSettingsMenu() {
    const settingsMenu = document.getElementById('settings-menu');
    settingsMenu.classList.toggle('show');
}

// 切换主题
function toggleTheme() {
    const themeToggle = document.getElementById('theme-toggle');
    const body = document.body;
    
    if (themeToggle.checked) {
        body.classList.add('dark-mode');
        localStorage.setItem('theme', 'dark');
    } else {
        body.classList.remove('dark-mode');
        localStorage.setItem('theme', 'light');
    }
    
    // 重新初始化粒子效果以适应新主题
    initParticles();
}

// 初始化主题
function initTheme() {
    const savedTheme = localStorage.getItem('theme');
    const themeToggle = document.getElementById('theme-toggle');
    
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-mode');
        if (themeToggle) {
            themeToggle.checked = true;
        }
    }
}

// 语言包
const translations = {
    'zh-CN': {
        'light_mode': '浅色模式',
        'dark_mode': '深色模式',
        'language': '语言',
        'chinese_simplified': '中文简体',
        'english_uk': '英语(英国)',
        'new_note': '新建笔记',
        'search_placeholder': '搜索笔记...',
        'all_categories': '所有分类',
        'all': '全部',
        'no_notes': '还没有笔记，点击「新建笔记」开始创建',
        'delete': '删除',
        'confirm_delete': '确定要删除这篇笔记吗？',
        'cancel': '取消',
        'confirm': '确认',
        'app_title': '笔记',
        'work': '工作',
        'life': '生活',
        'study': '学习',
        'other': '其他',
        'uncategorized': '未分类',
        'appearance': '外观',
        'ai_assistant': 'AI笔记助手',
        'send': '发送',
        'summarize': '总结',
        'keywords': '关键词',
        'suggestions': '改进建议',
        'ai_placeholder': '输入你的问题...'
    },
    'en-GB': {
        'light_mode': 'Light Mode',
        'dark_mode': 'Dark Mode',
        'language': 'Language',
        'chinese_simplified': 'Chinese Simplified',
        'english_uk': 'English (UK)',
        'new_note': 'New Note',
        'search_placeholder': 'Search notes...',
        'all_categories': 'All Categories',
        'all': 'All',
        'no_notes': 'No notes yet, click "New Note" to start creating',
        'delete': 'Delete',
        'confirm_delete': 'Are you sure you want to delete this note?',
        'cancel': 'Cancel',
        'confirm': 'Confirm',
        'app_title': 'Notedown',
        'work': 'Work',
        'life': 'Life',
        'study': 'Study',
        'other': 'Other',
        'uncategorized': 'Uncategorized',
        'appearance': 'Appearance',
        'files': 'Files',
        'ai_assistant': 'AI Note Assistant',
        'send': 'Send',
        'summarize': 'Summarize',
        'keywords': 'Keywords',
        'suggestions': 'Suggestions',
        'ai_placeholder': 'Enter your question...'
    }
};

// 切换语言
function changeLanguage(lang) {
    localStorage.setItem('language', lang);
    updateTranslations(lang);
    updateLanguageButtons(lang);
}

// 更新翻译
function updateTranslations(lang) {
    const elements = document.querySelectorAll('[data-lang]');
    elements.forEach(element => {
        const key = element.getAttribute('data-lang');
        if (translations[lang] && translations[lang][key]) {
            // 对于textarea元素，更新placeholder属性而不是textContent
            if (element.tagName === 'TEXTAREA') {
                element.placeholder = translations[lang][key];
            } else {
                element.textContent = translations[lang][key];
            }
        }
    });
    
    // 更新搜索框占位符
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.placeholder = translations[lang]['search_placeholder'];
    }
    
    // 更新分类筛选选项
    const categoryFilter = document.getElementById('category-filter');
    if (categoryFilter) {
        // 更新默认选项
        if (categoryFilter.options[0]) {
            categoryFilter.options[0].text = translations[lang]['all_categories'];
        }
        
        // 更新其他分类选项
        for (let i = 1; i < categoryFilter.options.length; i++) {
            const option = categoryFilter.options[i];
            const category = option.value;
            // 分类名称映射表
            const categoryMap = {
                '工作': 'work',
                '生活': 'life',
                '学习': 'study',
                '其他': 'other',
                '未分类': 'uncategorized'
            };
            
            // 根据语言获取正确的分类名称
            let categoryText = category;
            const mappedCategory = categoryMap[category];
            if (mappedCategory && translations[lang][mappedCategory]) {
                categoryText = translations[lang][mappedCategory];
            }
            option.textContent = categoryText;
        }
    }
    
    // 更新空状态提示
    const emptyState = document.getElementById('empty-state');
    if (emptyState) {
        emptyState.querySelector('p').textContent = translations[lang]['no_notes'];
    }
    
    // 更新笔记卡片中的分类标签
    updateNoteCategories(lang);
    
    // 更新分类导航
    generateCategoryNavigation();
}

// 更新语言按钮状态
function updateLanguageButtons(lang) {
    const languageButtons = document.querySelectorAll('.language-btn');
    languageButtons.forEach(button => {
        button.classList.remove('active');
        if ((button.onclick + '').includes(lang)) {
            button.classList.add('active');
        }
    });
}

// 更新笔记卡片中的分类标签
function updateNoteCategories(lang) {
    const noteCards = document.querySelectorAll('.note-card');
    noteCards.forEach(card => {
        const categorySpan = card.querySelector('.note-category');
        if (categorySpan) {
            // 获取卡片的分类类名
            const cardClasses = card.className.split(' ');
            let category = '未分类';
            
            // 查找分类类名
            for (const cls of cardClasses) {
                if (cls === '工作' || cls === '生活' || cls === '学习' || cls === '其他' || cls === '未分类') {
                    category = cls;
                    break;
                }
            }
            
            // 分类名称映射表
            const categoryMap = {
                '工作': 'work',
                '生活': 'life',
                '学习': 'study',
                '其他': 'other',
                '未分类': 'uncategorized'
            };
            
            // 获取翻译后的分类名称
            let categoryText = category;
            const mappedCategory = categoryMap[category];
            if (mappedCategory && translations[lang][mappedCategory]) {
                categoryText = translations[lang][mappedCategory];
            }
            categorySpan.textContent = categoryText;
        }
    });
}

// 初始化语言
function initLanguage() {
    const savedLanguage = localStorage.getItem('language') || 'zh-CN';
    changeLanguage(savedLanguage);
}

// 点击页面其他地方关闭设置菜单
document.addEventListener('click', function(event) {
    const settingsMenu = document.getElementById('settings-menu');
    const settingsBtn = document.querySelector('.settings-btn');
    
    if (!settingsMenu.contains(event.target) && !settingsBtn.contains(event.target)) {
        settingsMenu.classList.remove('show');
    }
});

// 初始化分类标签
function initCategoryTabs() {
    if (!categoryTabs) return;
    
    const tabButtons = categoryTabs.querySelectorAll('.tab-btn');
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            // 移除所有按钮的active类
            tabButtons.forEach(btn => btn.classList.remove('active'));
            // 添加active类到当前按钮
            button.classList.add('active');
            
            // 根据选择的分类过滤笔记
            const category = button.dataset.category;
            filterNotesByCategory(category);
            
            // 同时更新下拉筛选框
            categoryFilter.value = category;
        });
    });
}

// 根据分类过滤笔记
function filterNotesByCategory(category) {
    if (category === 'all') {
        // 显示所有笔记
        filteredNotes = [...notes];
    } else {
        // 显示指定分类的笔记
        filteredNotes = notes.filter(note => note.category === category);
    }
    
    // 应用当前搜索条件
    const searchTerm = searchInput.value.toLowerCase();
    if (searchTerm) {
        filteredNotes = filteredNotes.filter(note => 
            note.title.toLowerCase().includes(searchTerm) || 
            note.content.toLowerCase().includes(searchTerm)
        );
    }
    
    renderNotes();
}

// AI功能相关变量
let aiCurrentConversationId = null;
let aiConfig = {
    apiKey: localStorage.getItem('ai_api_key') || '',
    provider: localStorage.getItem('ai_provider') || 'openai'
};

// 切换AI侧边栏显示/隐藏
function toggleAISidebar() {
    const aiSidebar = document.getElementById('ai-sidebar');
    aiSidebar.classList.toggle('show');
    
    // 如果是打开侧边栏，检查配置
    if (aiSidebar.classList.contains('show')) {
        checkAIConfig();
    }
}

// 检查AI配置
function checkAIConfig() {
    // 检查是否已经配置过，避免重复弹窗
    const hasConfigured = localStorage.getItem('ai_config_prompt_shown') === 'true';
    
    if (hasConfigured) {
        return;
    }
    
    fetch(`${API_BASE_URL}/ai/config`)
        .then(response => response.json())
        .then(data => {
            const configPrompt = document.getElementById('ai-config-prompt');
            if (data.configured) {
                // 后端已配置，隐藏配置提示
                configPrompt.style.display = 'none';
                // 标记为已显示过弹窗
                localStorage.setItem('ai_config_prompt_shown', 'true');
            } else {
                // 后端未配置，显示配置提示
                configPrompt.style.display = 'block';
            }
        })
        .catch(error => {
            console.error('检查AI配置失败:', error);
            const configPrompt = document.getElementById('ai-config-prompt');
            configPrompt.style.display = 'block';
            localStorage.setItem('ai_config_prompt_shown', 'true');
        });
}

// 发送AI消息
function sendAIMessage() {
    const chatInput = document.getElementById('ai-chat-input');
    const message = chatInput.value.trim();
    
    if (!message) {
        return;
    }
    
    // 添加用户消息到聊天界面
    addAIMessage('user', message);
    
    // 清空输入框
    chatInput.value = '';
    
    // 显示AI正在输入状态
    showAITypingIndicator();
    
    // 发送消息到AI服务
    fetch(`${API_BASE_URL}/ai/chat`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            message: message,
            conversationId: aiCurrentConversationId,
            provider: aiConfig.provider
        })
    })
    .then(response => {
        if (!response.ok) {
            return response.json().then(err => { throw err; });
        }
        return response.json();
    })
    .then(data => {
        // 移除输入指示器
        hideAITypingIndicator();
        
        if (data.success) {
            // 更新对话ID
            aiCurrentConversationId = data.conversationId;
            
            // 添加AI回复到聊天界面
            addAIMessage('assistant', data.response);
        } else {
            addAIMessage('error', 'AI服务返回错误: ' + (data.details || data.error));
        }
    })
    .catch(error => {
        hideAITypingIndicator();
        console.error('发送消息失败:', error);
        addAIMessage('error', '发送消息失败: ' + (error.details || error.error || error.message));
    });
}

// 添加AI消息到聊天界面
function addAIMessage(role, content) {
    const chatMessages = document.getElementById('ai-chat-messages');
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${role}`;
    
    const messageContent = document.createElement('div');
    messageContent.className = 'message-content';
    
    if (role === 'user') {
        messageContent.innerHTML = `${content}`;
    } else if (role === 'assistant') {
        messageContent.innerHTML = `${formatAIResponse(content)}`;
    } else if (role === 'error') {
        messageContent.innerHTML = `${content}`;
        messageDiv.className = 'message error';
    }
    
    messageDiv.appendChild(messageContent);
    chatMessages.appendChild(messageDiv);
    
    // 滚动到底部
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// 格式化AI回复
function formatAIResponse(content) {
    // 简单格式化，将换行转换为HTML换行
    return content.replace(/\n/g, '<br>');
}

// 显示AI输入指示器
function showAITypingIndicator() {
    const chatMessages = document.getElementById('ai-chat-messages');
    const typingDiv = document.createElement('div');
    typingDiv.id = 'ai-typing-indicator';
    typingDiv.className = 'message typing';
    typingDiv.innerHTML = `
        <div class="message-content">
            <span class="typing-dots">正在输入...</span>
        </div>
    `;
    chatMessages.appendChild(typingDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// 隐藏AI输入指示器
function hideAITypingIndicator() {
    const typingIndicator = document.getElementById('ai-typing-indicator');
    if (typingIndicator) {
        typingIndicator.remove();
    }
}

// 快速AI操作
function quickAIAction(action) {
    const actions = {
        'summarize': '请帮我总结一下我的笔记内容',
        'keywords': '请提取这份笔记的关键词',
        'improve': '请给我的笔记内容提供改进建议'
    };
    
    const message = actions[action];
    if (message) {
        document.getElementById('ai-chat-input').value = message;
        sendAIMessage();
    }
}

// 关闭AI配置提示
function closeAIConfigPrompt() {
    const configPrompt = document.getElementById('ai-config-prompt');
    configPrompt.style.display = 'none';
    // 标记为已显示过弹窗，避免重复显示
    localStorage.setItem('ai_config_prompt_shown', 'true');
}

// 打开AI设置
function openAISettings() {
    const configPrompt = document.getElementById('ai-config-prompt');
    const settingsMenu = document.getElementById('settings-menu');
    
    // 关闭配置弹窗
    configPrompt.style.display = 'none';
    
    // 打开设置菜单
    settingsMenu.classList.add('show');
}

// 保存AI配置
function saveAIConfig() {
    const apiKey = document.getElementById('ai-api-key').value.trim();
    const provider = document.getElementById('ai-provider').value;
    
    if (!apiKey) {
        alert('请输入API密钥');
        return;
    }
    
    // 发送配置到后端保存
    fetch(`${API_BASE_URL}/ai/config`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            apiKey: apiKey,
            provider: provider
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // 更新全局配置
            aiConfig.apiKey = apiKey;
            aiConfig.provider = provider;
            
            // 保存到localStorage（仅用于前端显示）
            localStorage.setItem('ai_api_key', apiKey);
            localStorage.setItem('ai_provider', provider);
            
            alert(data.message || '配置已保存！请重启服务器使配置生效。');
        } else {
            alert('配置保存失败：' + (data.error || '未知错误'));
        }
    })
    .catch(error => {
        console.error('保存AI配置失败:', error);
        alert('配置保存失败，请检查后端服务是否正常运行');
    });
    
    // 关闭设置菜单
    toggleSettingsMenu();
}

// 加载保存的AI配置
function loadSavedAIConfig() {
    document.getElementById('ai-api-key').value = aiConfig.apiKey;
    document.getElementById('ai-provider').value = aiConfig.provider;
}

// 初始化页面
init();
// 初始化主题
initTheme();
// 初始化语言
initLanguage();
// 初始化粒子效果
initParticles();
// 加载AI配置
loadSavedAIConfig();

// 初始化AI聊天输入框键盘事件
(function initAIChatInput() {
    const chatInput = document.getElementById('ai-chat-input');
    if (chatInput) {
        chatInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendAIMessage();
            }
        });
        console.log('AI聊天输入框键盘事件已绑定');
    }
})();