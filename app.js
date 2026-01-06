/**
 * GameWav - 8-bit Audio Converter (Retro Mode)
 */

// ========== CLASSIFICATION MODE STATE ==========
let classificationMode = false;
let categories = []; // { name: 'BGM', files: [] }

window.onload = function () {
    initParticles();
    console.log("GameWav 8-bit System Initialized");
    setupEasterEgg();
    setupClassificationMode();
};

// ========== EASTER EGG ==========
function setupEasterEgg() {
    let clicks = 0;
    let timer;
    const logoBtn = document.getElementById('logo');

    logoBtn.addEventListener('click', () => {
        clicks++;
        playBeep(400 + (clicks * 100), 0.1, 'square');

        // Visual feedback
        logoBtn.style.filter = `brightness(${1 + clicks * 0.2})`;
        setTimeout(() => logoBtn.style.filter = '', 100);

        clearTimeout(timer);
        timer = setTimeout(() => { clicks = 0; }, 2000);

        if (clicks === 5) {
            toggleGameBoyMode();
            clicks = 0;
        }
    });
}

function toggleGameBoyMode() {
    document.body.classList.toggle('gameboy-mode');
    const isGB = document.body.classList.contains('gameboy-mode');
    const bitDisp = document.getElementById('bit-depth');
    const rateDisp = document.getElementById('sample-rate');

    // Clear particles to prevent accumulation
    particles = [];

    if (isGB) {
        // Switch to 8-bit
        bitDisp.innerText = '8-BIT';
        if (rateDisp) rateDisp.classList.remove('selected');
        playBeep(1000, 0.1, 'square');
        setTimeout(() => playBeep(2000, 0.4, 'square'), 100);
        showStatus('★ 8-BIT MODE UNLOCKED ★');

        spawnMeltdown('burn'); // Trigger burning effect
    } else {
        // Back to 16-bit (Pale Blue)
        bitDisp.innerText = '16-BIT';
        if (rateDisp) rateDisp.classList.add('selected');
        playBeep(200, 0.3, 'sawtooth');
        showStatus('SYSTEM READY');
        spawnMeltdown('glitch'); // Trigger digital glitch effect
    }
}

// ========== PARTICLES SYSTEM UPDATE ==========
// ========== PARTICLES SYSTEM UPDATE ==========
function spawnMeltdown(type) {
    const pCount = 150;
    for (let i = 0; i < pCount; i++) {
        let p = {
            x: Math.random() * w,
            y: type === 'burn' ? h : 0,
            vx: (Math.random() - 0.5) * 8,
            vy: type === 'burn' ? -(Math.random() * 5 + 3) : (Math.random() * 5 + 3),
            size: Math.random() * 6 + 2,
            life: Math.random() * 1.5 + 0.5,
            color: type === 'burn' ?
                (Math.random() > 0.5 ? '#9bbc0f' : '#0f380f') : // GB Colors
                (Math.random() > 0.5 ? '#9cdcfe' : '#4ec9b0')   // Pale Blue/Cyan
        };
        particles.push(p);
    }
}

let bgAudioCtx;

function playBeep(freq, dur, type = 'sine') {
    // Initialize context if missing
    if (!bgAudioCtx) {
        bgAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }

    // Resume if suspended (browser autopilot policy)
    if (bgAudioCtx.state === 'suspended') {
        bgAudioCtx.resume();
    }

    const osc = bgAudioCtx.createOscillator();
    const gain = bgAudioCtx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, bgAudioCtx.currentTime);

    gain.gain.setValueAtTime(0.1, bgAudioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, bgAudioCtx.currentTime + dur);

    osc.connect(gain);
    gain.connect(bgAudioCtx.destination);

    osc.start();
    osc.stop(bgAudioCtx.currentTime + dur);
}

// ========== AUDIO CORE ==========
const TARGET_SAMPLE_RATE = 44100;
let conversionCtx = null; // Shared context for conversions

function getConversionContext() {
    if (!conversionCtx || conversionCtx.state === 'closed') {
        conversionCtx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: TARGET_SAMPLE_RATE });
    }
    return conversionCtx;
}

document.getElementById('dropZone').addEventListener('click', () => document.getElementById('fileInput').click());
document.getElementById('fileInput').addEventListener('change', (e) => handleFiles(e.target.files));

const dropZone = document.getElementById('dropZone');
dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.style.background = '#39ff1433'; });
dropZone.addEventListener('dragleave', (e) => { e.preventDefault(); dropZone.style.background = ''; });
dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.style.background = '';
    handleFiles(e.dataTransfer.files);
});

async function handleFiles(files) {
    for (let file of files) {
        if (file.name.match(/\.(mp3|wav|aiff|aif)$/i)) {
            await convertFile(file);
        } else {
            showStatus('BAD FILE EXTENSION');
        }
    }
}

async function convertFile(file) {
    const list = document.getElementById('fileList');
    const div = document.createElement('div');
    div.className = 'file-item';
    div.innerHTML = `<span>${file.name.substring(0, 15)}...</span><span class="status-text">LOAD..</span>`;
    list.appendChild(div);

    try {
        const arrayBuf = await file.arrayBuffer();
        const ctx = getConversionContext();

        // Clone buffer to avoid detached ArrayBuffer issues
        const audioBuf = await ctx.decodeAudioData(arrayBuf.slice(0));

        // Convert to WAV
        const wav = bufferToWav(audioBuf);
        const url = URL.createObjectURL(wav);

        // Download
        const a = document.createElement('a');
        a.href = url;
        a.download = file.name.replace(/\.[^/.]+$/, "") + "_UE.wav";
        document.body.appendChild(a);
        a.click();

        // Cleanup immediately
        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 500);

        div.querySelector('.status-text').innerText = 'OK!';
        div.style.background = '#4ec9b0';

        spawnExplosion();
        showStatus('CONVERSION COMPLETE');

    } catch (e) {
        console.error(e);
        div.querySelector('.status-text').innerText = 'ERR';
        div.style.background = '#ff0055';
    }
}

// ========== WAV ENCODER (16-bit PCM) ==========
function bufferToWav(abuffer) {
    const numOfChan = abuffer.numberOfChannels;
    const length = abuffer.length * numOfChan * 2 + 44;
    const buffer = new ArrayBuffer(length);
    const view = new DataView(buffer);
    const channels = [];
    let i, sample;
    let offset = 0;
    let pos = 0;

    // Write WAV Header
    setUint32(0x46464952); // "RIFF"
    setUint32(length - 8); // file length - 8
    setUint32(0x45564157); // "WAVE"
    setUint32(0x20746d66); // "fmt " chunk
    setUint32(16); // length = 16
    setUint16(1); // PCM (uncompressed)
    setUint16(numOfChan);
    setUint32(abuffer.sampleRate);
    setUint32(abuffer.sampleRate * 2 * numOfChan); // avg. bytes/sec
    setUint16(numOfChan * 2); // block-align
    setUint16(16); // 16-bit (hardcoded)
    setUint32(0x61746164); // "data" - chunk
    setUint32(length - pos - 44); // chunk length

    // Interleave channels
    for (i = 0; i < abuffer.numberOfChannels; i++)
        channels.push(abuffer.getChannelData(i));

    while (pos < abuffer.length) {
        for (i = 0; i < numOfChan; i++) {
            sample = Math.max(-1, Math.min(1, channels[i][pos])); // clamp
            sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767) | 0; // convert to 16-bit PCM
            view.setInt16(44 + offset, sample, true);
            offset += 2;
        }
        pos++;
    }

    return new Blob([buffer], { type: "audio/wav" });

    function setUint16(data) { view.setUint16(pos, data, true); pos += 2; }
    function setUint32(data) { view.setUint32(pos, data, true); pos += 4; }
}

function showStatus(msg) {
    document.getElementById('status').innerText = msg;
}

// ========== PARTICLES ==========
let canvas, ctx, w, h, particles = [];

function initParticles() {
    canvas = document.getElementById('particles');
    ctx = canvas.getContext('2d');
    resize();
    window.onresize = resize;
    loop();
}

function resize() {
    w = canvas.width = canvas.parentElement.clientWidth;
    h = canvas.height = canvas.parentElement.clientHeight;
}

function spawnExplosion() {
    const isGB = document.body.classList.contains('gameboy-mode');
    for (let i = 0; i < 30; i++) {
        particles.push({
            x: w / 2,
            y: h / 2,
            vx: (Math.random() - 0.5) * 10,
            vy: (Math.random() - 0.5) * 10,
            size: 4 + Math.random() * 6,
            color: isGB ?
                (Math.random() > 0.5 ? '#9bbc0f' : '#306230') :
                (Math.random() > 0.5 ? '#9cdcfe' : '#dcdcaa'),
            life: 1.0
        });
    }
}

function loop() {
    ctx.clearRect(0, 0, w, h);

    // Ambient floating particles
    if (Math.random() < 0.1) {
        const isGB = document.body.classList.contains('gameboy-mode');
        particles.push({
            x: Math.random() * w,
            y: h,
            vx: 0,
            vy: -1 - Math.random(),
            size: 2 + Math.random() * 4,
            color: isGB ? '#0f380f' : '#4ec9b0', // Dark Green (GB) or Soft Cyan (Pale)
            life: 2.0
        });
    }

    for (let i = particles.length - 1; i >= 0; i--) {
        let p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 0.01;

        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.life;
        ctx.fillRect(Math.floor(p.x), Math.floor(p.y), p.size, p.size); // Square pixels

        if (p.life <= 0) particles.splice(i, 1);
    }

    requestAnimationFrame(loop);
}

// ========== CLASSIFICATION MODE ==========
function setupClassificationMode() {
    const toggle = document.getElementById('classificationToggle');
    const categoryPanel = document.getElementById('categoryPanel');
    const defaultDropZone = document.getElementById('dropZone');
    const categoryZonesContainer = document.getElementById('categoryDropZones');
    const downloadBtn = document.getElementById('downloadAllBtn');
    const addBtn = document.getElementById('addCategoryBtn');
    const categoryInput = document.getElementById('categoryName');

    // Toggle handler
    toggle.addEventListener('change', () => {
        classificationMode = toggle.checked;

        if (classificationMode) {
            categoryPanel.classList.remove('hidden');
            defaultDropZone.classList.add('hidden');
            categoryZonesContainer.classList.remove('hidden');
            downloadBtn.classList.remove('hidden');
            showStatus('分类模式已启用');
        } else {
            categoryPanel.classList.add('hidden');
            defaultDropZone.classList.remove('hidden');
            categoryZonesContainer.classList.add('hidden');
            downloadBtn.classList.add('hidden');
            showStatus('普通模式');
        }
        playBeep(800, 0.1, 'square');
    });

    // Add category
    addBtn.addEventListener('click', () => addCategory());
    categoryInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') addCategory();
    });

    // Download all
    downloadBtn.addEventListener('click', downloadAllAsZip);
}

function addCategory() {
    const input = document.getElementById('categoryName');
    const name = input.value.trim().toUpperCase();

    if (!name) return;
    if (categories.find(c => c.name === name)) {
        showStatus('分类已存在!');
        return;
    }

    categories.push({ name, files: [] });
    input.value = '';

    renderCategoryTags();
    renderCategoryDropZones();
    playBeep(600, 0.1, 'square');
    showStatus(`已添加分类: ${name}`);
}

function removeCategory(name) {
    categories = categories.filter(c => c.name !== name);
    renderCategoryTags();
    renderCategoryDropZones();
    playBeep(300, 0.1, 'sawtooth');
}

function renderCategoryTags() {
    const list = document.getElementById('categoryList');
    list.innerHTML = categories.map(c => `
        <div class="category-tag">
            ${c.name} (${c.files.length})
            <span class="delete-cat" onclick="removeCategory('${c.name}')">✕</span>
        </div>
    `).join('');
}

function renderCategoryDropZones() {
    const container = document.getElementById('categoryDropZones');
    container.innerHTML = categories.map(c => `
        <div class="category-drop" data-category="${c.name}">
            <div class="cat-name">${c.name}</div>
            <div class="cat-count">${c.files.length} 文件</div>
        </div>
    `).join('');

    // Add drop handlers to each zone
    container.querySelectorAll('.category-drop').forEach(zone => {
        const catName = zone.dataset.category;

        zone.addEventListener('dragover', (e) => {
            e.preventDefault();
            zone.classList.add('drag-over');
        });

        zone.addEventListener('dragleave', () => {
            zone.classList.remove('drag-over');
        });

        zone.addEventListener('drop', async (e) => {
            e.preventDefault();
            zone.classList.remove('drag-over');
            await handleCategoryDrop(catName, e.dataTransfer.files);
        });

        zone.addEventListener('click', () => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.mp3,.wav,.aiff,.aif';
            input.multiple = true;
            input.onchange = async (e) => {
                await handleCategoryDrop(catName, e.target.files);
            };
            input.click();
        });
    });
}

async function handleCategoryDrop(categoryName, files) {
    const cat = categories.find(c => c.name === categoryName);
    if (!cat) return;

    const fileArray = Array.from(files).filter(f => f.name.match(/\.(mp3|wav|aiff|aif)$/i));
    const total = fileArray.length;
    let processed = 0;

    // Batch processing - 3 files at a time to balance speed and memory
    const BATCH_SIZE = 3;

    for (let i = 0; i < fileArray.length; i += BATCH_SIZE) {
        const batch = fileArray.slice(i, i + BATCH_SIZE);

        await Promise.all(batch.map(async (file) => {
            try {
                const arrayBuf = await file.arrayBuffer();
                const ctx = getConversionContext();
                const audioBuf = await ctx.decodeAudioData(arrayBuf.slice(0));
                const wav = bufferToWav(audioBuf);

                const newName = file.name.replace(/\.[^/.]+$/, "") + "_UE.wav";
                cat.files.push({ name: newName, blob: wav });

                processed++;
                showStatus(`${categoryName}: ${processed}/${total} 转换中...`);

            } catch (e) {
                console.error(e);
                processed++;
                showStatus(`转换失败: ${file.name}`);
            }
        }));

        // Allow garbage collection between batches
        await new Promise(r => setTimeout(r, 50));
    }

    spawnExplosion();
    playBeep(1200, 0.1, 'square');
    renderCategoryTags();
    renderCategoryDropZones();
    showStatus(`${categoryName}: ${cat.files.length} 文件就绪 ✓`);
}

async function downloadAllAsZip() {
    if (categories.length === 0) {
        showStatus('请先添加分类!');
        return;
    }

    const totalFiles = categories.reduce((sum, c) => sum + c.files.length, 0);
    if (totalFiles === 0) {
        showStatus('没有已转换的文件!');
        return;
    }

    showStatus('正在打包...');
    playBeep(400, 0.2, 'square');

    const zip = new JSZip();

    for (const cat of categories) {
        const folder = zip.folder(cat.name);
        for (const file of cat.files) {
            folder.file(file.name, file.blob);
        }
    }

    try {
        const content = await zip.generateAsync({ type: 'blob' });
        const url = URL.createObjectURL(content);

        const a = document.createElement('a');
        a.href = url;
        a.download = 'GameWav_Export.zip';
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 1000);

        showStatus('✓ 下载完成!');
        playBeep(1000, 0.1, 'square');
        setTimeout(() => playBeep(1500, 0.3, 'square'), 100);
        spawnExplosion();

    } catch (e) {
        console.error(e);
        showStatus('打包失败!');
    }
}

