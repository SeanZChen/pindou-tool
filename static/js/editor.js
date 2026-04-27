const douUploadArea = document.getElementById('douUploadArea');
const douFileInput = document.getElementById('douFileInput');
const openDouBtn = document.getElementById('openDouBtn');
const openDouFileInput = document.getElementById('openDouFileInput');

let selectedCells = [];
let isMouseDown = false;
let editHistory = [];
let isEraserMode = false;
let hasSavedEraserHistory = false;
let selectedColor = null;
let highlightedColor = null;

let editorDouData = null;
let editorOriginalDouData = null;

douUploadArea.addEventListener('click', () => douFileInput.click());

douFileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
        handleDouFile(e.target.files[0]);
    }
});

openDouBtn.addEventListener('click', () => {
    openDouFileInput.click();
});

openDouFileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
        handleDouFile(e.target.files[0]);
        e.target.value = '';
    }
});

function handleDouFile(file) {
    if (!file.name.endsWith('.dou')) {
        alert('请上传 .dou 文件');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const douData = JSON.parse(e.target.result);
            loadDouData(douData);
        } catch (err) {
            alert('无效的 .dou 文件');
        }
    };
    reader.readAsText(file);
}

function loadDouDataForEditor(douData) {
    loadDouData(douData);
}

document.getElementById('createNewTemplateBtn').addEventListener('click', () => {
    const width = parseInt(document.getElementById('newWidth').value);
    const height = parseInt(document.getElementById('newHeight').value);
    
    if (width < 10 || width > 100 || height < 10 || height > 100) {
        alert('宽度和高度必须在 10-100 之间');
        return;
    }
    
    const grid = Array(height).fill(null).map(() => Array(width).fill(null));
    const douData = {
        width: width,
        height: height,
        grid: grid,
        color_map: {}
    };
    
    loadDouData(douData);
});

function loadDouData(douData) {
    editorDouData = douData;
    editorOriginalDouData = JSON.parse(JSON.stringify(douData));
    editHistory = [];
    
    document.getElementById('editorContainer').style.display = 'block';
    document.getElementById('douUploadArea').style.display = 'none';
    document.getElementById('undoBtn').disabled = true;
    
    renderEditorCanvas();
    renderColorPicker();
    renderUsedColors();
}

function renderEditorCanvas() {
    const canvas = document.getElementById('editorCanvas');
    canvas.innerHTML = '';
    
    const grid = editorDouData.grid;
    const h = grid.length;
    const w = grid[0].length;
    
    canvas.style.gridTemplateColumns = `repeat(${w}, 1fr)`;
    
    const handleCellMouseDown = (x, y) => {
        isMouseDown = true;
        if (isEraserMode) {
            removeCellFromSelection(x, y);
        } else {
            addCellToSelection(x, y);
        }
    };
    
    const handleCellMouseEnter = (x, y) => {
        if (isMouseDown) {
            if (isEraserMode) {
                removeCellFromSelection(x, y);
            } else {
                addCellToSelection(x, y);
            }
        }
    };
    
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const cell = document.createElement('div');
            cell.className = 'canvas-cell';
            cell.dataset.x = x;
            cell.dataset.y = y;
            
            const code = grid[y][x];
            if (code) {
                const rgb = getMardColors()[code];
                cell.style.backgroundColor = `rgb(${rgb.join(', ')})`;
                cell.textContent = code;
                cell.style.color = rgb.reduce((a, b) => a + b) > 382 ? '#000' : '#fff';
            } else {
                cell.classList.add('transparent');
            }
            
            cell.addEventListener('mousedown', () => {
                handleCellMouseDown(x, y);
            });
            
            cell.addEventListener('mouseenter', () => {
                handleCellMouseEnter(x, y);
            });
            
            canvas.appendChild(cell);
        }
    }
    
    canvas.addEventListener('mouseup', () => {
        isMouseDown = false;
        hasSavedEraserHistory = false;
    });
    
    canvas.addEventListener('mouseleave', () => {
        isMouseDown = false;
        hasSavedEraserHistory = false;
    });
    
    document.addEventListener('mouseup', () => {
        isMouseDown = false;
        hasSavedEraserHistory = false;
    });
}

function toggleCellSelection(x, y) {
    const cell = document.querySelector(`[data-x="${x}"][data-y="${y}"]`);
    const key = `${x},${y}`;
    const idx = selectedCells.indexOf(key);
    
    if (idx > -1) {
        selectedCells.splice(idx, 1);
        cell.classList.remove('selected');
    } else {
        selectedCells.push(key);
        cell.classList.add('selected');
    }
}

function addCellToSelection(x, y) {
    const cell = document.querySelector(`[data-x="${x}"][data-y="${y}"]`);
    const key = `${x},${y}`;
    const idx = selectedCells.indexOf(key);
    
    if (idx === -1) {
        selectedCells.push(key);
        cell.classList.add('selected');
    }
}

function removeCellFromSelection(x, y) {
    const cell = document.querySelector(`[data-x="${x}"][data-y="${y}"]`);
    const key = `${x},${y}`;
    const idx = selectedCells.indexOf(key);
    
    if (idx !== -1) {
        selectedCells.splice(idx, 1);
        cell.classList.remove('selected');
    }
    
    if (isEraserMode && editorDouData.grid[y][x]) {
        if (!hasSavedEraserHistory) {
            editHistory.push(JSON.stringify(editorDouData));
            if (editHistory.length > 50) {
                editHistory.shift();
            }
            document.getElementById('undoBtn').disabled = false;
            hasSavedEraserHistory = true;
        }
        
        editorDouData.grid[y][x] = null;
        cell.style.backgroundColor = '#fff';
        cell.textContent = '';
        cell.classList.add('transparent');
        renderUsedColors();
    }
}

function renderColorPicker() {
    const grid = document.getElementById('colorPickerGrid');
    grid.innerHTML = '';
    
    const transparentBtn = document.createElement('div');
    transparentBtn.className = 'color-picker-item transparent-option';
    transparentBtn.title = '透明/删除';
    transparentBtn.textContent = '×';
    transparentBtn.addEventListener('click', () => selectColor(null));
    grid.appendChild(transparentBtn);
    
    const letterOrder = 'ABCDEFGHM';
    const colorGroups = {};
    
    letterOrder.split('').forEach(letter => {
        colorGroups[letter] = [];
    });
    
    Object.entries(getMardColors()).forEach(([code, rgb]) => {
        const letter = code.charAt(0);
        if (colorGroups[letter]) {
            colorGroups[letter].push({ code, rgb });
        }
    });
    
    letterOrder.split('').forEach(letter => {
        const groupColors = colorGroups[letter];
        if (groupColors.length === 0) return;
        
        groupColors.sort((a, b) => {
            const numA = parseInt(a.code.substring(1));
            const numB = parseInt(b.code.substring(1));
            return numA - numB;
        });
        
        const group = document.createElement('div');
        group.className = 'color-group';
        
        const header = document.createElement('div');
        header.className = 'color-group-header';
        header.textContent = `${letter}系列 (${groupColors.length}色)`;
        group.appendChild(header);
        
        const colorsContainer = document.createElement('div');
        colorsContainer.className = 'color-group-colors';
        
        groupColors.forEach(({ code, rgb }) => {
            const item = document.createElement('div');
            item.className = 'color-picker-item';
            item.style.backgroundColor = `rgb(${rgb.join(', ')})`;
            item.title = code;
            item.dataset.code = code;
            item.textContent = code;
            item.style.color = rgb.reduce((a, b) => a + b) > 382 ? '#000' : '#fff';
            
            item.addEventListener('click', () => selectColor(code));
            colorsContainer.appendChild(item);
        });
        
        group.appendChild(colorsContainer);
        grid.appendChild(group);
    });
}

function selectColor(code) {
    document.querySelectorAll('.color-picker-item').forEach(item => {
        item.classList.remove('selected');
    });
    
    if (code) {
        document.querySelector(`[data-code="${code}"]`).classList.add('selected');
        isEraserMode = false;
        const btn = document.getElementById('eraserBtn');
        btn.style.background = '#f0f0f0';
        btn.style.color = '#666';
        btn.textContent = '橡皮擦';
    } else {
        document.querySelector('.transparent-option').classList.add('selected');
    }
    selectedColor = code;
}

document.getElementById('applyColorBtn').addEventListener('click', () => {
    if (selectedCells.length === 0) {
        alert('请先选择要编辑的格点');
        return;
    }
    
    editHistory.push(JSON.stringify(editorDouData));
    
    if (editHistory.length > 50) {
        editHistory.shift();
    }
    
    document.getElementById('undoBtn').disabled = false;
    
    selectedCells.forEach(key => {
        const [x, y] = key.split(',').map(Number);
        editorDouData.grid[y][x] = selectedColor;
        
        if (selectedColor) {
            if (!editorDouData.color_map[selectedColor]) {
                editorDouData.color_map[selectedColor] = getMardColors()[selectedColor];
            }
        }
        
        const cell = document.querySelector(`[data-x="${x}"][data-y="${y}"]`);
        if (selectedColor) {
            const rgb = getMardColors()[selectedColor];
            cell.style.backgroundColor = `rgb(${rgb.join(', ')})`;
            cell.textContent = selectedColor;
            cell.style.color = rgb.reduce((a, b) => a + b) > 382 ? '#000' : '#fff';
            cell.classList.remove('transparent');
        } else {
            cell.style.backgroundColor = '#fff';
            cell.textContent = '';
            cell.classList.add('transparent');
        }
    });
    
    selectedCells = [];
    document.querySelectorAll('.canvas-cell').forEach(cell => {
        cell.classList.remove('selected');
    });
    
    renderUsedColors();
});

document.getElementById('deleteSelectedBtn').addEventListener('click', () => {
    if (selectedCells.length === 0) {
        alert('请先选择要删除的格点');
        return;
    }
    
    editHistory.push(JSON.stringify(editorDouData));
    if (editHistory.length > 50) {
        editHistory.shift();
    }
    document.getElementById('undoBtn').disabled = false;
    
    selectColor(null);
    document.getElementById('applyColorBtn').click();
});

document.getElementById('undoBtn').addEventListener('click', () => {
    if (editHistory.length === 0) {
        return;
    }
    
    const previousState = JSON.parse(editHistory.pop());
    editorDouData = previousState;
    
    if (editHistory.length === 0) {
        document.getElementById('undoBtn').disabled = true;
    }
    
    renderEditorCanvas();
    renderUsedColors();
});

document.getElementById('eraserBtn').addEventListener('click', () => {
    isEraserMode = !isEraserMode;
    const btn = document.getElementById('eraserBtn');
    if (isEraserMode) {
        btn.style.background = '#e74c3c';
        btn.style.color = '#fff';
        btn.textContent = '橡皮擦 (开启)';
    } else {
        btn.style.background = '#f0f0f0';
        btn.style.color = '#666';
        btn.textContent = '橡皮擦';
    }
});

document.getElementById('clearHighlightBtn').addEventListener('click', () => {
    clearHighlight();
});

document.getElementById('previewEditedBtn').addEventListener('click', async () => {
    try {
        const response = await fetch('/dou-to-image', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ dou_data: editorDouData })
        });
        
        const data = await response.json();
        
        if (data.success) {
            const previewWindow = window.open();
            previewWindow.document.write(`<img src="data:image/png;base64,${hexToBase64(data.image_data)}" style="max-width: 100%;">`);
        } else {
            alert('预览失败: ' + data.error);
        }
    } catch (error) {
        alert('预览失败: ' + error.message);
    }
});

document.getElementById('downloadEditedDouBtn').addEventListener('click', async () => {
    openDownloadModal('template_edited', 'dou', async (fullFilename) => {
        try {
            const response = await fetch('/download-dou', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ dou_data: editorDouData })
            });
            
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fullFilename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        } catch (error) {
            alert('下载失败: ' + error.message);
        }
    });
});

document.getElementById('compareBtn').addEventListener('click', async () => {
    const compareView = document.getElementById('compareView');
    
    if (compareView.style.display === 'none' || compareView.style.display === '') {
        try {
            const originalResponse = await fetch('/dou-to-image', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ dou_data: editorOriginalDouData })
            });
            const originalData = await originalResponse.json();
            
            const editedResponse = await fetch('/dou-to-image', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ dou_data: editorDouData })
            });
            const editedData = await editedResponse.json();
            
            if (originalData.success && editedData.success) {
                document.getElementById('beforePreview').src = 
                    'data:image/png;base64,' + hexToBase64(originalData.image_data);
                document.getElementById('afterPreview').src = 
                    'data:image/png;base64,' + hexToBase64(editedData.image_data);
                compareView.style.display = 'grid';
            }
        } catch (error) {
            alert('对比失败: ' + error.message);
        }
    } else {
        compareView.style.display = 'none';
    }
});

function renderUsedColors() {
    const list = document.getElementById('usedColorsList');
    list.innerHTML = '';
    
    const colorCounts = countColors();
    const sortedColors = Object.entries(colorCounts).sort((a, b) => b[1] - a[1]);
    
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
            highlightColor(code);
        });
        
        list.appendChild(item);
    });
}

function countColors() {
    const counts = {};
    const grid = editorDouData.grid;
    
    for (let y = 0; y < grid.length; y++) {
        for (let x = 0; x < grid[y].length; x++) {
            const code = grid[y][x];
            if (code) {
                counts[code] = (counts[code] || 0) + 1;
            }
        }
    }
    
    return counts;
}

function highlightColor(code) {
    clearHighlight();
    
    if (highlightedColor === code) {
        highlightedColor = null;
        return;
    }
    
    highlightedColor = code;
    
    document.querySelectorAll('.used-color-item').forEach(item => {
        item.classList.remove('active');
        if (item.dataset.code === code) {
            item.classList.add('active');
        }
    });
    
    document.querySelectorAll('.canvas-cell').forEach(cell => {
        if (cell.textContent === code) {
            cell.classList.add('highlighted');
        }
    });
}

function clearHighlight() {
    highlightedColor = null;
    
    document.querySelectorAll('.used-color-item').forEach(item => {
        item.classList.remove('active');
    });
    
    document.querySelectorAll('.canvas-cell').forEach(cell => {
        cell.classList.remove('highlighted');
    });
}