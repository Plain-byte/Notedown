/**
 * 分类页面 - 核心功能实现
 * 显示特定分类下的所有笔记
 */

// 全局变量
let notes = [];
let filteredNotes = [];
let currentCategory = '';

// DOM元素
const notesContainer = document.getElementById('notes-container');
const emptyState = document.getElementById('empty-state');
const searchInput = document.getElementById('search-input');
const categoryTitle = document.getElementById('category-title');

// API基础URL
const API_BASE_URL = 'http://localhost:3001/api';

// 初始化页面
function init() {
    // 获取URL参数
    const urlParams = new URLSearchParams(window.location.search);
    currentCategory = urlParams.get('category') || '';
    
    if (!currentCategory) {
        window.location.href = 'index.html';
        return;
    }
    
    // 设置页面标题
    updateCategoryTitle();
    
    // 从服务器加载分类笔记
    loadCategoryNotes();
    
    // 初始化搜索事件
    searchInput.addEventListener('input', handleSearch);
}

// 更新分类标题
function updateCategoryTitle() {
    const lang = localStorage.getItem('language') || 'zh-CN';
    
    // 分类名称映射表
    const categoryMap = {
        '工作': 'work',
        '生活': 'life',
        '学习': 'study',
        '其他': 'other',
        '未分类': 'uncategorized'
    };
    
    const mappedCategory = categoryMap[currentCategory] || currentCategory;
    const categoryText = translations[lang][mappedCategory] || currentCategory;
    
    if (categoryTitle) {
        categoryTitle.textContent = categoryText;
    }
}

// 加载分类笔记
function loadCategoryNotes() {
    fetch(`${API_BASE_URL}/notes`)
        .then(response => {
            if (!response.ok) {
                throw new Error('网络响应不正常');
            }
            return response.json();
        })
        .then(data => {
            // 筛选出当前分类的笔记
            notes = data
                .filter(note => note.category === currentCategory)
                .map(note => ({
                    ...note,
                    id: note.id.toString(),
                    updatedAt: note.updated_at,
                    createdAt: note.created_at
                }));
            
            filteredNotes = [...notes];
            renderNotes();
        })
        .catch(error => {
            console.error('获取笔记失败:', error);
            notes = [];
            filteredNotes = [];
            renderNotes();
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
        
        // 更新空状态文本
        const lang = localStorage.getItem('language') || 'zh-CN';
        const emptyText = translations[lang]['no_notes_category'] || '该分类下还没有笔记';
        emptyState.querySelector('p').textContent = emptyText;
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
    // 传递当前分类信息，以便返回时能回到正确的分类页面
    window.location.href = `edit.html?id=${noteId}&fromCategory=${encodeURIComponent(currentCategory)}`;
}

// 返回首页或上一级页面
function goBack() {
    // 检查是否从首页跳转而来，如果是则返回到首页
    const referrer = document.referrer;
    if (referrer.includes('index.html')) {
        window.location.href = 'index.html';
    } else {
        // 否则使用浏览器后退
        window.history.back();
    }
}

// 处理搜索
function handleSearch() {
    const searchTerm = searchInput.value.toLowerCase();
    filterNotes(searchTerm);
}

// 过滤笔记
function filterNotes(searchTerm) {
    filteredNotes = notes.filter(note => {
        const matchesSearch = note.title.toLowerCase().includes(searchTerm) || 
                            note.content.toLowerCase().includes(searchTerm);
        return matchesSearch;
    });
    renderNotes();
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
        'no_notes_category': '该分类下还没有笔记',
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
        'appearance': '外观'
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
        'no_notes_category': 'No notes in this category',
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
        'appearance': 'Appearance'
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
            element.textContent = translations[lang][key];
        }
    });
    
    // 更新搜索框占位符
    if (searchInput) {
        searchInput.placeholder = translations[lang]['search_placeholder'];
    }
    
    // 更新空状态提示
    const emptyState = document.getElementById('empty-state');
    if (emptyState) {
        const emptyText = translations[lang]['no_notes_category'] || '该分类下还没有笔记';
        emptyState.querySelector('p').textContent = emptyText;
    }
    
    // 更新分类标题
    updateCategoryTitle();
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

// 初始化页面
init();
// 初始化主题
initTheme();
// 初始化语言
initLanguage();
// 初始化粒子效果
initParticles();