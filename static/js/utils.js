let mardColors = {};

fetch('/get-colors')
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            mardColors = data.colors;
        }
    });

function hexToBase64(hex) {
    return btoa(hex.match(/\w{2}/g).map(a => String.fromCharCode(parseInt(a, 16))).join(''));
}

function getColorFromCode(code) {
    const rgb = mardColors[code];
    return rgb ? rgb.join(', ') : '255, 255, 255';
}

function getMardColors() {
    return mardColors;
}

async function downloadFile(content, defaultFilename, mimeType = 'application/octet-stream') {
    const blob = new Blob([content], { type: mimeType });
    
    if ('showSaveFilePicker' in window) {
        try {
            const handle = await window.showSaveFilePicker({
                suggestedName: defaultFilename,
                types: [{
                    description: '文件',
                    accept: { [mimeType]: ['.*'] }
                }]
            });
            const writable = await handle.createWritable();
            await writable.write(blob);
            await writable.close();
            return;
        } catch (err) {
            if (err.name !== 'AbortError') {
                console.error('保存失败:', err);
            }
        }
    }
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = defaultFilename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

async function downloadBlob(blob, defaultFilename, mimeType = 'application/octet-stream') {
    if ('showSaveFilePicker' in window) {
        try {
            const handle = await window.showSaveFilePicker({
                suggestedName: defaultFilename,
                types: [{
                    description: '文件',
                    accept: { [mimeType]: ['.*'] }
                }]
            });
            const writable = await handle.createWritable();
            await writable.write(blob);
            await writable.close();
            return;
        } catch (err) {
            if (err.name !== 'AbortError') {
                console.error('保存失败:', err);
            }
        }
    }
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = defaultFilename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function downloadImageFromCanvas(canvas, filename) {
    const link = document.createElement('a');
    link.download = filename;
    link.href = canvas.toDataURL('image/png');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}