/**
 * 笔记编辑页面 - 核心功能实现
 * 支持新建笔记和编辑现有笔记
 */

// 全局变量
let currentNote = null;
let uploadedFiles = [];
let deletedFiles = []; // 存储已删除文件的ID

// DOM元素
let pageTitle;
let noteTitle;
let noteCategory;
let noteContent;
let fileUpload;
let filesPreview;

// API基础URL
const API_BASE_URL = 'http://localhost:3001/api';

// 初始化页面
function init() {
    // 获取DOM元素
    pageTitle = document.getElementById('page-title');
    noteTitle = document.getElementById('note-title');
    noteCategory = document.getElementById('note-category');
    noteContent = document.getElementById('note-content');
    fileUpload = document.getElementById('file-upload');
    filesPreview = document.getElementById('files-preview');
    
    // 获取URL参数，检查是否是编辑模式
    const urlParams = new URLSearchParams(window.location.search);
    const noteId = urlParams.get('id');
    
    if (noteId) {
        // 编辑模式
        loadNote(noteId);
        if (pageTitle) {
            pageTitle.textContent = '编辑笔记';
        }
        // 显示删除按钮
        const deleteButton = document.getElementById('delete-button');
        if (deleteButton) {
            deleteButton.style.display = 'inline-block';
        }
    } else {
        // 新建模式
        currentNote = null;
        if (pageTitle) {
            pageTitle.textContent = '新建笔记';
        }
    }
    
    // 初始化文件上传事件
    initFileUpload();
}

// 加载现有笔记
function loadNote(noteId) {
    fetch(`${API_BASE_URL}/notes/${noteId}`)
        .then(response => {
            if (!response.ok) {
                throw new Error('获取笔记失败');
            }
            return response.json();
        })
        .then(note => {
            currentNote = note;
            // 填充表单
            noteTitle.value = note.title;
            noteCategory.value = note.category || '';
            noteContent.value = note.content || '';
            
            // 加载文件
            if (note.files) {
                // 转换文件格式为前端兼容格式，处理中文文件名编码
                uploadedFiles = note.files.map(file => {
                    let fileName = file.name;
                    try {
                        // 如果文件名包含非ASCII字符，尝试解码
                        if (/[^\x00-\x7F]/.test(fileName)) {
                            fileName = decodeURIComponent(escape(fileName));
                        }
                    } catch (e) {
                        console.log('文件名解码失败，使用原始名称:', fileName);
                    }
                    return {
                        id: file.id, // 添加文件ID
                        name: fileName,
                        type: file.type,
                        path: file.path,
                        data: `${API_BASE_URL.replace('/api', '')}/uploads/${file.path.split('/').pop()}` // 生成服务器访问URL
                    };
                });
                renderFilesPreview();
            }
        })
        .catch(error => {
            console.error('获取笔记失败:', error);
            alert('获取笔记失败，请检查网络连接或服务器状态');
        });
}

// 保存笔记
function saveNote() {
    // 确保DOM元素已加载
    if (!noteTitle || !noteCategory || !noteContent) {
        alert('页面加载中，请稍后重试');
        return;
    }
    
    // 获取表单数据
    const title = noteTitle.value.trim();
    const category = noteCategory.value;
    const content = noteContent.value;
    
    if (!title) {
        alert('请输入笔记标题');
        return;
    }
    
    // 创建FormData对象用于文件上传
    const formData = new FormData();
    formData.append('title', title);
    formData.append('category', category || '');
    formData.append('content', content || '');
    
    // 添加已删除的文件ID列表
    if (currentNote && deletedFiles.length > 0) {
        formData.append('deletedFiles', JSON.stringify(deletedFiles));
    }
    
    // 添加文件 - 包含原有的文件和新上传的文件
    // 对于编辑模式，我们需要保留原有的文件
    if (currentNote) {
        // 在编辑模式时，只上传新文件，原有的文件由服务器保留
        if (fileUpload.files.length > 0) {
            for (let i = 0; i < fileUpload.files.length; i++) {
                formData.append('files', fileUpload.files[i]);
            }
        }
    } else {
        // 新建模式，上传所有文件
        if (fileUpload.files.length > 0) {
            for (let i = 0; i < fileUpload.files.length; i++) {
                formData.append('files', fileUpload.files[i]);
            }
        }
    }
    
    const url = currentNote 
        ? `${API_BASE_URL}/notes/${currentNote.id}`
        : `${API_BASE_URL}/notes`;
    
    const method = currentNote ? 'PUT' : 'POST';
    
    // 显示保存中状态
    const saveButton = document.querySelector('button[data-action="save"]');
    const originalText = saveButton.textContent;
    saveButton.textContent = '保存中...';
    saveButton.disabled = true;
    
    fetch(url, {
        method: method,
        body: formData
    })
    .then(response => {
        console.log('服务器响应状态:', response.status);
        if (!response.ok) {
            return response.text().then(text => {
                throw new Error(`保存失败 (${response.status}): ${text}`);
            });
        }
        return response.json();
    })
        .then(data => {
            console.log('保存成功:', data);
            // 检查是否从分类页面跳转而来，如果是则返回到分类页面
            const urlParams = new URLSearchParams(window.location.search);
            const fromCategory = urlParams.get('fromCategory');
            
            if (fromCategory) {
                // 返回到对应的分类页面
                window.location.href = `category.html?category=${encodeURIComponent(fromCategory)}`;
            } else {
                // 否则返回到首页
                window.location.href = 'index.html';
            }
        })
    .catch(error => {
        console.error('保存笔记失败:', error);
        alert(`保存失败: ${error.message}`);
        // 恢复按钮状态
        saveButton.textContent = originalText;
        saveButton.disabled = false;
    });
}

// 生成唯一ID
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// 初始化文件上传功能
function initFileUpload() {
    const fileUploadArea = document.getElementById('file-upload-area');
    const fileInput = document.getElementById('file-upload');
    
    // 处理文件选择
    fileInput.addEventListener('change', handleFileUpload);
    
    // 添加拖放支持
    fileUploadArea.addEventListener('dragover', function(e) {
        e.preventDefault();
        const isDarkMode = document.body.classList.contains('dark-mode');
        this.style.borderColor = isDarkMode ? '#00bfff' : '#007AFF';
        this.style.backgroundColor = isDarkMode ? '#1a2332' : '#f0f8ff';
    });
    
    fileUploadArea.addEventListener('dragleave', function(e) {
        e.preventDefault();
        const isDarkMode = document.body.classList.contains('dark-mode');
        this.style.borderColor = isDarkMode ? '#444' : '#ddd';
        this.style.backgroundColor = isDarkMode ? '#2d2d2d' : '#f9f9f9';
    });
    
    fileUploadArea.addEventListener('drop', function(e) {
        e.preventDefault();
        const isDarkMode = document.body.classList.contains('dark-mode');
        this.style.borderColor = isDarkMode ? '#444' : '#ddd';
        this.style.backgroundColor = isDarkMode ? '#2d2d2d' : '#f9f9f9';
        
        const files = e.dataTransfer.files;
        handleFileUpload({ target: { files } });
    });
}

// 处理文件上传
function handleFileUpload(event) {
    const files = event.target.files;
    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const reader = new FileReader();
        reader.onload = function(e) {
        uploadedFiles.push({
            name: file.name,
            type: file.type || '',
            data: e.target.result,
            id: null // 新上传的文件还没有ID
        });
        renderFilesPreview();
        };
        reader.readAsDataURL(file);
    }
}

// 获取文件图标
function getFileIcon(fileType, fileName) {
    if (fileType.startsWith('image/')) {
        return '🖼️';
    } else if (fileName.endsWith('.ppt') || fileName.endsWith('.pptx')) {
        return '📊';
    } else if (fileName.endsWith('.doc') || fileName.endsWith('.docx')) {
        return '📄';
    } else if (fileName.endsWith('.xlsx')) {
        return '📈';
    } else if (fileName.endsWith('.pdf')) {
        return '📄 PDF';
    } else if (fileName.endsWith('.md')) {
        return '📝';
    } else {
        return '📄';
    }
}

// 渲染文件预览
function renderFilesPreview() {
    filesPreview.innerHTML = '';
    
    // 分离图片和其他文件
    const images = uploadedFiles.filter(file => {
        const type = file.type || '';
        const name = file.name || '';
        return type.startsWith('image/') || 
               name.match(/\.(jpg|jpeg|png|gif|bmp|webp)$/i);
    });
    
    const otherFiles = uploadedFiles.filter(file => {
        const type = file.type || '';
        const name = file.name || '';
        return !type.startsWith('image/') && 
               !name.match(/\.(jpg|jpeg|png|gif|bmp|webp)$/i);
    });
    
    // 检查是否有文件需要显示
    if (uploadedFiles.length === 0) {
        return;
    }
    
    // 显示图片
    images.forEach((file, index) => {
        const fileItem = document.createElement('div');
        fileItem.className = 'file-item image-item';
        
        // 生成图片URL
        let imageUrl = file.data;
        if (file.path && !file.data) {
            // 从服务器路径生成访问URL
            imageUrl = `${API_BASE_URL.replace('/api', '')}/uploads/${file.path.split('/').pop()}`;
        }
        
        // 去掉文件后缀
        const fileNameWithoutExtension = file.name.replace(/\.[^/.]+$/, "");
        
        fileItem.innerHTML = `
            <img src="${imageUrl}" alt="${fileNameWithoutExtension}">
            <button class="remove-file" onclick="removeFile(${uploadedFiles.indexOf(file)})">&times;</button>
        `;
        
        // 为图片添加点击打开功能
        fileItem.addEventListener('click', (e) => {
            if (!e.target.classList.contains('remove-file')) {
                window.open(imageUrl, '_blank');
            }
        });
        
        filesPreview.appendChild(fileItem);
    });
    
    // 显示其他文件
    otherFiles.forEach((file, index) => {
        const fileItem = document.createElement('div');
        fileItem.className = 'file-item document-item';
        
        let fileIcon = '';
        let iconClass = '';
        const fileName = file.name || '';
        
        if (fileName.endsWith('.ppt') || fileName.endsWith('.pptx')) {
            fileIcon = 'PPT';
            iconClass = 'ppt-icon';
        } else if (fileName.endsWith('.doc') || fileName.endsWith('.docx')) {
            fileIcon = 'Word';
            iconClass = 'word-icon';
        } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
            fileIcon = 'Excel';
            iconClass = 'excel-icon';
        } else if (fileName.endsWith('.md')) {
            fileIcon = 'Markdown';
            iconClass = 'markdown-icon';
        } else if (fileName.endsWith('.pdf')) {
            fileIcon = 'PDF';
            iconClass = 'pdf-icon';
        } else {
            fileIcon = 'File';
            iconClass = 'file-icon';
        }
        
        // 去掉文件后缀
        const fileNameWithoutExtension = fileName.replace(/\.[^/.]+$/, "");
        
        // 生成文件访问URL
        let fileUrl = file.data;
        if (file.path && !file.data) {
            // 从服务器路径生成访问URL
            fileUrl = `${API_BASE_URL.replace('/api', '')}/uploads/${file.path.split('/').pop()}`;
        }
        
        fileItem.innerHTML = `
            <div class="document-icon ${iconClass}">${fileIcon}</div>
            <div class="file-name">${fileNameWithoutExtension}</div>
            <button class="remove-file" onclick="removeFile(${uploadedFiles.indexOf(file)})">&times;</button>
        `;
        
        // 为文档文件添加点击打开功能
        fileItem.addEventListener('click', (e) => {
            if (!e.target.classList.contains('remove-file')) {
                // 根据文件类型决定打开方式
                if (fileName.endsWith('.pdf') || fileName.endsWith('.md') || fileName.endsWith('.txt')) {
                    // PDF、Markdown、文本文件在浏览器中打开
                    window.open(fileUrl, '_blank');
                } else {
                    // Office文档等直接下载并尝试用系统默认程序打开
                    const link = document.createElement('a');
                    link.href = fileUrl;
                    link.download = file.name;
                    link.target = '_blank';
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                }
            }
        });
        
        filesPreview.appendChild(fileItem);
    });
}

// 移除文件
function removeFile(index) {
    const file = uploadedFiles[index];
    // 如果是已存在的文件（有ID），添加到删除列表
    if (file && file.id) {
        deletedFiles.push(file.id);
    }
    uploadedFiles.splice(index, 1);
    renderFilesPreview();
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
        'edit_note': '编辑笔记',
        'back': '返回',
        'save': '保存',
        'title': '标题',
        'category': '分类',
        'content': '内容',
        'files': '文件',
        'upload_files': '点击或拖拽上传文件',
        'title_placeholder': '输入笔记标题',
        'content_placeholder': '输入笔记内容',
        'app_title': '笔记',
        'appearance': '外观',
        'work': '工作',
        'life': '生活',
        'study': '学习',
        'other': '其他',
        'uncategorized': '未分类',
        'all': '全部',
        'delete': '删除',
        'confirm_delete': '确定要删除这篇笔记吗？',
        'cancel': '取消',
        'confirm': '确认'
    },
    'en-GB': {
        'light_mode': 'Light Mode',
        'dark_mode': 'Dark Mode',
        'language': 'Language',
        'chinese_simplified': 'Chinese Simplified',
        'english_uk': 'English (UK)',
        'new_note': 'New Note',
        'edit_note': 'Edit Note',
        'back': 'Back',
        'save': 'Save',
        'title': 'Title',
        'category': 'Category',
        'content': 'Content',
        'files': 'Files',
        'upload_files': 'Click or drag to upload files',
        'title_placeholder': 'Enter note title',
        'content_placeholder': 'Enter note content',
        'app_title': 'Notedown',
        'appearance': 'Appearance',
        'work': 'Work',
        'life': 'Life',
        'study': 'Study',
        'other': 'Other',
        'uncategorized': 'Uncategorized',
        'all': 'All',
        'delete': 'Delete',
        'confirm_delete': 'Are you sure you want to delete this note?',
        'cancel': 'Cancel',
        'confirm': 'Confirm'
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
    
    // 更新页面标题
    const pageTitle = document.getElementById('page-title');
    if (pageTitle) {
        // 检查是否是新建笔记页面
        if (window.location.pathname.includes('edit.html') && !window.location.search) {
            pageTitle.textContent = translations[lang]['new_note'];
        } else if (window.location.pathname.includes('edit.html') && window.location.search) {
            pageTitle.textContent = translations[lang]['edit_note'];
        }
    }
    
    // 更新按钮文本
    const backButton = document.querySelector('button[data-action="back"]');
    if (backButton) {
        backButton.textContent = translations[lang]['back'];
    }
    
    const saveButton = document.querySelector('button[data-action="save"]');
    if (saveButton) {
        saveButton.textContent = translations[lang]['save'];
    }
    
    const deleteButton = document.querySelector('button[data-action="delete"]');
    if (deleteButton) {
        deleteButton.textContent = translations[lang]['delete'];
    }
    
    // 更新表单标签
    const titleLabel = document.querySelector('label[for="note-title"]');
    if (titleLabel) {
        titleLabel.textContent = translations[lang]['title'];
    }
    
    const categoryLabel = document.querySelector('label[for="note-category"]');
    if (categoryLabel) {
        categoryLabel.textContent = translations[lang]['category'];
    }
    
    const contentLabel = document.querySelector('label[for="note-content"]');
    if (contentLabel) {
        contentLabel.textContent = translations[lang]['content'];
    }
    
    const filesLabel = document.querySelector('label[for="file-upload"]');
    if (filesLabel) {
        filesLabel.textContent = translations[lang]['files'];
    }
    
    // 更新文件上传提示
    const fileUploadLabel = document.querySelector('.file-upload label');
    if (fileUploadLabel) {
        fileUploadLabel.textContent = translations[lang]['upload_files'];
    }
    
    // 更新分类选择下拉菜单
    const categorySelect = document.getElementById('note-category');
    if (categorySelect) {
        for (let i = 0; i < categorySelect.options.length; i++) {
            const option = categorySelect.options[i];
            const key = option.getAttribute('data-lang');
            if (key && translations[lang][key]) {
                option.textContent = translations[lang][key];
            }
        }
    }
    
    // 更新输入框占位符
    const titleInput = document.getElementById('note-title');
    if (titleInput) {
        titleInput.placeholder = translations[lang]['title_placeholder'] || '输入笔记标题';
    }
    
    const contentTextarea = document.getElementById('note-content');
    if (contentTextarea) {
        contentTextarea.placeholder = translations[lang]['content_placeholder'] || '输入笔记内容';
    }
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

// 全局变量，存储当前要删除的笔记ID
let currentNoteId = null;

// 显示确认对话框
function showDeleteConfirm() {
    if (!currentNote) {
        alert('无法删除，当前没有可删除的笔记');
        return;
    }
    
    currentNoteId = currentNote.id;
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
            // 检查是否从分类页面跳转而来，如果是则返回到分类页面
            const urlParams = new URLSearchParams(window.location.search);
            const fromCategory = urlParams.get('fromCategory');
            
            if (fromCategory) {
                // 返回到对应的分类页面
                window.location.href = `category.html?category=${encodeURIComponent(fromCategory)}`;
            } else {
                // 否则返回到首页
                window.location.href = 'index.html';
            }
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