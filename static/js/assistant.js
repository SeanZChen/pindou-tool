let assistantDouData = null;
let assistantZoom = 1;
let assistantHighlightedColor = null;

const assistantUploadArea = document.getElementById('assistantUploadArea');
const assistantDouFileInput = document.getElementById('assistantDouFileInput');

assistantUploadArea.addEventListener('click', () => assistantDouFileInput.click());

assistantUploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    assistantUploadArea.classList.add('dragover');
});

assistantUploadArea.addEventListener('dragleave', () => {
    assistantUploadArea.classList.remove('dragover');
});

assistantUploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    assistantUploadArea.classList.remove('dragover');
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        loadAssistantDou(files[0]);
    }
});

assistantDouFileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
        loadAssistantDou(e.target.files[0]);
    }
});

function loadAssistantDou(file) {
    if (!file.name.endsWith('.dou')) {
        alert('请上传 .dou 文件');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            assistantDouData = JSON.parse(e.target.result);
            assistantZoom = 1;
            document.getElementById('zoomLevel').textContent = '100%';
            renderAssistantCanvas();
            renderAssistantColorList();
            document.getElementById('assistantContainer').style.display = 'block';
            document.getElementById('assistantUploadArea').style.display = 'none';
        } catch (err) {
            alert('无效的 .dou 文件');
        }
    };
    reader.readAsText(file);
}

function renderAssistantCanvas() {
    const canvas = document.getElementById('assistantCanvas');
    canvas.innerHTML = '';
    
    const existingOverlay = canvas.parentElement.querySelector('.grid-overlay');
    if (existingOverlay) {
        existingOverlay.remove();
    }
    
    if (!assistantDouData) return;
    
    const grid = assistantDouData.grid;
    const h = grid.length;
    const w = grid[0].length;
    const cellSize = Math.round(24 * assistantZoom);
    const gap = Math.max(1, Math.round(1 * assistantZoom));
    
    canvas.style.gridTemplateColumns = `repeat(${w}, ${cellSize}px)`;
    canvas.style.gap = `${gap}px`;
    
    const showGrid = document.getElementById('showGrid').checked;
    
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const cell = document.createElement('div');
            cell.className = 'canvas-cell';
            cell.dataset.x = x;
            cell.dataset.y = y;
            cell.style.width = `${cellSize}px`;
            cell.style.height = `${cellSize}px`;
            cell.style.fontSize = `${Math.max(8, Math.round(10 * assistantZoom))}px`;
            
            if (showGrid) {
                let borderTop = 'none';
                let borderLeft = 'none';
                
                if (y % 5 === 0) {
                    borderTop = '2px solid #000';
                }
                if (x % 5 === 0) {
                    borderLeft = '2px solid #000';
                }
                
                cell.style.borderTop = borderTop;
                cell.style.borderLeft = borderLeft;
            } else {
                cell.style.borderTop = '';
                cell.style.borderLeft = '';
            }
            
            const code = grid[y][x];
            if (code) {
                const rgb = getMardColors()[code];
                cell.style.backgroundColor = `rgb(${rgb.join(', ')})`;
                cell.textContent = code;
                cell.style.color = rgb.reduce((a, b) => a + b) > 382 ? '#000' : '#fff';
            } else {
                cell.classList.add('transparent');
            }
            
            canvas.appendChild(cell);
        }
    }
    
    if (showGrid) {
        const gridOverlay = document.createElement('div');
        gridOverlay.className = 'grid-overlay';
        gridOverlay.style.position = 'absolute';
        gridOverlay.style.top = canvas.offsetTop + 'px';
        gridOverlay.style.left = canvas.offsetLeft + 'px';
        gridOverlay.style.pointerEvents = 'none';
        gridOverlay.style.display = 'grid';
        gridOverlay.style.gridTemplateColumns = `repeat(${w}, ${cellSize}px)`;
        gridOverlay.style.gap = `${gap}px`;
        
        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                const gridCell = document.createElement('div');
                gridCell.style.width = `${cellSize}px`;
                gridCell.style.height = `${cellSize}px`;
                
                let borderBottom = 'none';
                let borderRight = 'none';
                
                if (y % 5 === 4 || y === h - 1) {
                    borderBottom = '2px solid #000';
                }
                if (x % 5 === 4 || x === w - 1) {
                    borderRight = '2px solid #000';
                }
                
                gridCell.style.borderBottom = borderBottom;
                gridCell.style.borderRight = borderRight;
                gridOverlay.appendChild(gridCell);
            }
        }
        
        canvas.parentElement.style.position = 'relative';
        canvas.parentElement.appendChild(gridOverlay);
    } else {
        const existingOverlay = canvas.parentElement.querySelector('.grid-overlay');
        if (existingOverlay) {
            existingOverlay.remove();
        }
    }
    
    updateAssistantHighlight();
}

function renderAssistantColorList() {
    const list = document.getElementById('assistantColorList');
    list.innerHTML = '';
    
    if (!assistantDouData) return;
    
    const counts = {};
    const grid = assistantDouData.grid;
    
    for (let y = 0; y < grid.length; y++) {
        for (let x = 0; x < grid[y].length; x++) {
            const code = grid[y][x];
            if (code) {
                counts[code] = (counts[code] || 0) + 1;
            }
        }
    }
    
    const sortedColors = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    
    sortedColors.forEach(([code, count]) => {
        const item = document.createElement('div');
        item.className = 'used-color-item';
        item.dataset.code = code;
        
        const colorBox = document.createElement('div');
        colorBox.className = 'used-color-box';
        const rgb = getMardColors()[code];
        colorBox.style.backgroundColor = `rgb(${rgb.join(', ')})`;
        
        const codeSpan = document.createElement('span');
        codeSpan.className = 'used-color-code';
        codeSpan.textContent = code;
        
        const countSpan = document.createElement('span');
        countSpan.className = 'used-color-count';
        countSpan.textContent = `${count}颗`;
        
        item.appendChild(colorBox);
        item.appendChild(codeSpan);
        item.appendChild(countSpan);
        
        item.addEventListener('click', () => {
            highlightAssistantColor(code);
        });
        
        list.appendChild(item);
    });
}

function highlightAssistantColor(code) {
    assistantHighlightedColor = assistantHighlightedColor === code ? null : code;
    updateAssistantHighlight();
    
    document.querySelectorAll('.used-color-item').forEach(item => {
        item.classList.remove('active');
        if (item.dataset.code === code && assistantHighlightedColor) {
            item.classList.add('active');
        }
    });
}

function updateAssistantHighlight() {
    document.querySelectorAll('#assistantCanvas .canvas-cell').forEach(cell => {
        if (assistantHighlightedColor) {
            if (cell.textContent === assistantHighlightedColor) {
                cell.style.opacity = '1';
                cell.style.border = '2px solid #ff6b6b';
            } else {
                cell.style.opacity = '0.3';
                cell.style.border = '1px solid rgba(0,0,0,0.1)';
            }
        } else {
            cell.style.opacity = '1';
            cell.style.border = '1px solid rgba(0,0,0,0.1)';
        }
    });
}

document.getElementById('zoomInBtn').addEventListener('click', () => {
    if (assistantZoom < 3) {
        assistantZoom += 0.25;
        document.getElementById('zoomLevel').textContent = `${Math.round(assistantZoom * 100)}%`;
        renderAssistantCanvas();
    }
});

document.getElementById('zoomOutBtn').addEventListener('click', () => {
    if (assistantZoom > 0.5) {
        assistantZoom -= 0.25;
        document.getElementById('zoomLevel').textContent = `${Math.round(assistantZoom * 100)}%`;
        renderAssistantCanvas();
    }
});

document.getElementById('showGrid').addEventListener('change', () => {
    renderAssistantCanvas();
});

document.getElementById('clearColorHighlight').addEventListener('click', () => {
    assistantHighlightedColor = null;
    updateAssistantHighlight();
    document.querySelectorAll('.used-color-item').forEach(item => {
        item.classList.remove('active');
    });
});