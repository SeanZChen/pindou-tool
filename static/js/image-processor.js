const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const processBtn = document.getElementById('processBtn');
const loading = document.getElementById('loading');
const results = document.getElementById('results');

let uploadedFile = null;
let currentImages = {};
let currentDouData = null;
let originalDouData = null;

uploadArea.addEventListener('click', () => fileInput.click());

uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadArea.classList.add('dragover');
});

uploadArea.addEventListener('dragleave', () => {
    uploadArea.classList.remove('dragover');
});

uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.classList.remove('dragover');
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        handleFile(files[0]);
    }
});

fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
        handleFile(e.target.files[0]);
    }
});

function handleFile(file) {
    if (!file.type.startsWith('image/')) {
        alert('请上传图片文件');
        return;
    }
    uploadedFile = file;
    processBtn.disabled = false;
    uploadArea.innerHTML = `
        <i>✅</i>
        <p>已选择: ${file.name}</p>
        <small>点击更换图片</small>
    `;
}

document.getElementById('useAI').addEventListener('change', () => {
    const aiConfig = document.getElementById('aiConfig');
    aiConfig.style.display = document.getElementById('useAI').checked ? 'block' : 'none';
});

processBtn.addEventListener('click', async () => {
    if (!uploadedFile) return;
    
    const size = document.getElementById('size').value;
    const simplify = document.getElementById('simplify').checked;
    const minCount = document.getElementById('minCount').value;
    const useAI = document.getElementById('useAI').checked;
    const apiKey = document.getElementById('apiKey').value;
    
    if (useAI && !apiKey) {
        alert('请输入火山引擎API Key');
        return;
    }
    
    const formData = new FormData();
    formData.append('file', uploadedFile);
    formData.append('size', size);
    formData.append('simplify', simplify);
    formData.append('min_count', minCount);
    formData.append('ai', useAI);
    formData.append('api_key', apiKey);
    
    loading.classList.add('show');
    results.style.display = 'none';
    
    try {
        const response = await fetch('/process', {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        
        if (data.success) {
            currentImages = data.images;
            currentDouData = data.dou_data;
            originalDouData = JSON.parse(JSON.stringify(data.dou_data));
            
            document.getElementById('originalSize').textContent = 
                `${data.original_size[0]} × ${data.original_size[1]}`;
            document.getElementById('downsampledSize').textContent = 
                `${data.downsampled_size[0]} × ${data.downsampled_size[1]}`;
            document.getElementById('colorCount').textContent = 
                Object.keys(data.color_counts).length;
            
            if (data.images.ai_processed) {
                document.getElementById('aiProcessedImg').src = 
                    'data:image/png;base64,' + hexToBase64(data.images.ai_processed);
                document.getElementById('aiProcessedCard').style.display = 'block';
            } else {
                document.getElementById('aiProcessedCard').style.display = 'none';
            }
            
            document.getElementById('lowResImg').src = 
                'data:image/png;base64,' + hexToBase64(data.images.low_res);
            document.getElementById('mosaicImg').src = 
                'data:image/png;base64,' + hexToBase64(data.images.mosaic);
            document.getElementById('colorMapImg').src = 
                'data:image/png;base64,' + hexToBase64(data.images.color_map);
            
            if (data.images.original_color_map) {
                document.getElementById('originalColorMapImg').src = 
                    'data:image/png;base64,' + hexToBase64(data.images.original_color_map);
                document.getElementById('originalColorMapCard').style.display = 'block';
                document.getElementById('originalColorCountsTab').style.display = 'block';
            } else {
                document.getElementById('originalColorMapCard').style.display = 'none';
                document.getElementById('originalColorCountsTab').style.display = 'none';
            }
            
            renderColorList('colorCountsList', data.color_counts);
            renderColorList('originalColorCountsList', data.original_color_counts);
            
            loading.classList.remove('show');
            results.style.display = 'block';
        } else {
            alert('处理失败: ' + data.error);
            loading.classList.remove('show');
        }
    } catch (error) {
        alert('网络错误: ' + error.message);
        loading.classList.remove('show');
    }
});

function renderColorList(elementId, colorCounts) {
    const container = document.getElementById(elementId);
    container.innerHTML = '';
    
    const sortedColors = Object.entries(colorCounts)
        .sort((a, b) => b[1] - a[1]);
    
    sortedColors.forEach(([code, count]) => {
        const item = document.createElement('div');
        item.className = 'color-item';
        item.innerHTML = `
            <div class="color-box" style="background-color: rgb(${getColorFromCode(code)})"></div>
            <span class="color-code">${code}</span>
            <span class="color-count">${count} 颗</span>
        `;
        container.appendChild(item);
    });
}

document.querySelectorAll('.download-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
        const type = btn.dataset.type;
        const imageData = currentImages[type];
        
        if (!imageData) return;
        
        const defaultFilenames = {
            'low_res': '低分辨率图.png',
            'mosaic': '马赛克效果.png',
            'color_map': '颜色映射图.png',
            'original_color_map': '简化前颜色映射图.png'
        };
        
        try {
            const response = await fetch('/download/' + type, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ image_data: imageData })
            });
            
            const blob = await response.blob();
            await downloadBlob(blob, defaultFilenames[type] || 'image.png', 'image/png');
        } catch (error) {
            alert('下载失败: ' + error.message);
        }
    });
});

document.getElementById('downloadDouBtn').addEventListener('click', async () => {
    if (!currentDouData) return;
    
    try {
        const response = await fetch('/download-dou', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ dou_data: currentDouData })
        });
        
        const blob = await response.blob();
        await downloadBlob(blob, 'template.dou', 'application/json');
    } catch (error) {
        alert('下载失败: ' + error.message);
    }
});

document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        
        tab.classList.add('active');
        const tabContent = document.getElementById(tab.dataset.tab);
        if (tabContent) {
            tabContent.classList.add('active');
        }
    });
});

document.getElementById('editTemplateBtn').addEventListener('click', () => {
    if (!currentDouData) return;
    navigateTo('edit-pindou');
    loadDouDataForEditor(currentDouData);
});

function getCurrentDouData() {
    return currentDouData;
}

function getOriginalDouData() {
    return originalDouData;
}

function setCurrentDouData(data) {
    currentDouData = data;
}