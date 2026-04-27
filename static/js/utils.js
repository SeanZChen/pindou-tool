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

let downloadCallback = null;
let downloadDefaultFilename = '';
let downloadDefaultFormat = 'png';

function openDownloadModal(filename, format = 'png', callback) {
    downloadCallback = callback;
    downloadDefaultFilename = filename;
    downloadDefaultFormat = format;
    
    document.getElementById('downloadFilename').value = filename;
    document.getElementById('downloadFormat').value = format;
    document.getElementById('downloadModal').style.display = 'flex';
}

function closeDownloadModal() {
    document.getElementById('downloadModal').style.display = 'none';
    downloadCallback = null;
    downloadDefaultFilename = '';
}

async function confirmDownload() {
    const filename = document.getElementById('downloadFilename').value.trim();
    const format = document.getElementById('downloadFormat').value;
    
    if (!filename) {
        alert('请输入文件名');
        return;
    }
    
    let fullFilename = filename;
    const extension = format === 'dou' ? '.dou' : '.png';
    
    if (!fullFilename.endsWith(extension)) {
        fullFilename += extension;
    }
    
    closeDownloadModal();
    
    if (downloadCallback) {
        await downloadCallback(fullFilename, format);
    }
}