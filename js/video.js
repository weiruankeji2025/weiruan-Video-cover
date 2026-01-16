/**
 * 威软视频封面提取器 - 视频处理模块
 * 使用 Canvas API 提取视频封面
 */

// 全局变量
let currentVideo = null;
let currentCovers = [];
let selectedCoverIndex = -1;

/**
 * 质量配置
 */
const QUALITY_SETTINGS = {
    high: { width: 1920, height: 1080, name: '高品质' },
    medium: { width: 1280, height: 720, name: '清晰' },
    low: { width: 854, height: 480, name: '一般' }
};

/**
 * 处理视频上传
 */
async function handleVideoUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    // 验证文件类型
    if (!file.type.startsWith('video/')) {
        showToast('请上传视频文件', 'error');
        return;
    }

    // 验证文件大小（限制2GB）
    const maxSize = 2 * 1024 * 1024 * 1024;
    if (file.size > maxSize) {
        showToast('视频文件不能超过 2GB', 'error');
        return;
    }

    // 显示进度条
    showProgress();

    try {
        // 提取封面
        await extractCovers(file);

        // 记录上传
        const currentUser = UserManager.getCurrentUser();
        if (currentUser) {
            const quality = getSelectedQuality();
            HistoryManager.addUploadRecord(currentUser.id, {
                fileName: file.name,
                fileSize: file.size,
                quality: quality,
                coverCount: 5
            });
            StatsManager.incrementUploadCount(currentUser.id);
        }

        showToast('封面提取成功！', 'success');
    } catch (error) {
        console.error('提取封面失败:', error);
        showToast('提取封面失败，请重试', 'error');
        hideProgress();
    }
}

/**
 * 提取视频封面
 */
async function extractCovers(file) {
    return new Promise((resolve, reject) => {
        const video = document.createElement('video');
        video.preload = 'metadata';
        video.muted = true;

        const fileURL = URL.createObjectURL(file);
        video.src = fileURL;

        video.onloadedmetadata = async function() {
            try {
                const duration = video.duration;
                const quality = getSelectedQuality();
                const settings = QUALITY_SETTINGS[quality];

                // 清空之前的封面
                currentCovers = [];

                // 计算5个时间点（开始、1/4、1/2、3/4、结尾前）
                const timePoints = [
                    Math.max(0.1, duration * 0.05),  // 5%
                    duration * 0.25,                 // 25%
                    duration * 0.5,                  // 50%
                    duration * 0.75,                 // 75%
                    Math.min(duration - 0.1, duration * 0.95) // 95%
                ];

                // 更新进度
                updateProgress(10, '正在分析视频...');

                // 提取每个时间点的封面
                for (let i = 0; i < timePoints.length; i++) {
                    const time = timePoints[i];
                    const coverData = await captureFrame(video, time, settings);
                    currentCovers.push({
                        index: i,
                        time: time,
                        data: coverData,
                        quality: quality
                    });

                    // 更新进度
                    const progress = 10 + (i + 1) * 18;
                    updateProgress(progress, `提取封面 ${i + 1}/5...`);
                }

                // 显示封面
                updateProgress(100, '完成！');
                setTimeout(() => {
                    displayCovers();
                    hideProgress();
                    resolve();
                }, 500);

                // 释放资源
                URL.revokeObjectURL(fileURL);
                currentVideo = file;

            } catch (error) {
                URL.revokeObjectURL(fileURL);
                reject(error);
            }
        };

        video.onerror = function() {
            URL.revokeObjectURL(fileURL);
            reject(new Error('视频加载失败'));
        };
    });
}

/**
 * 捕获视频帧
 */
function captureFrame(video, time, settings) {
    return new Promise((resolve, reject) => {
        video.currentTime = time;

        video.onseeked = function() {
            try {
                // 创建 canvas
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');

                // 设置画布大小
                canvas.width = settings.width;
                canvas.height = settings.height;

                // 计算视频缩放比例
                const videoRatio = video.videoWidth / video.videoHeight;
                const targetRatio = settings.width / settings.height;

                let drawWidth, drawHeight, offsetX = 0, offsetY = 0;

                if (videoRatio > targetRatio) {
                    // 视频更宽，以高度为准
                    drawHeight = settings.height;
                    drawWidth = drawHeight * videoRatio;
                    offsetX = (settings.width - drawWidth) / 2;
                } else {
                    // 视频更高，以宽度为准
                    drawWidth = settings.width;
                    drawHeight = drawWidth / videoRatio;
                    offsetY = (settings.height - drawHeight) / 2;
                }

                // 填充黑色背景
                ctx.fillStyle = '#000000';
                ctx.fillRect(0, 0, settings.width, settings.height);

                // 绘制视频帧
                ctx.drawImage(video, offsetX, offsetY, drawWidth, drawHeight);

                // 转换为 base64
                const imageData = canvas.toDataURL('image/jpeg', 0.9);
                resolve(imageData);

            } catch (error) {
                reject(error);
            }
        };

        video.onerror = function() {
            reject(new Error('视频帧捕获失败'));
        };
    });
}

/**
 * 显示封面
 */
function displayCovers() {
    const coverPreview = document.getElementById('coverPreview');
    const coverGrid = document.getElementById('coverGrid');
    const uploadZone = document.getElementById('uploadZone');

    // 隐藏上传区域
    uploadZone.style.display = 'none';

    // 清空网格
    coverGrid.innerHTML = '';

    // 创建封面项
    currentCovers.forEach((cover, index) => {
        const coverItem = document.createElement('div');
        coverItem.className = 'cover-item';
        coverItem.onclick = () => selectCover(index);

        const img = document.createElement('img');
        img.src = cover.data;
        img.alt = `封面 ${index + 1}`;

        const label = document.createElement('div');
        label.className = 'cover-label';
        label.textContent = `封面 ${index + 1}`;

        coverItem.appendChild(img);
        coverItem.appendChild(label);
        coverGrid.appendChild(coverItem);

        // 添加淡入动画
        setTimeout(() => {
            coverItem.style.animation = `slideUp 0.5s ease-out ${index * 0.1}s forwards`;
            coverItem.style.opacity = '0';
        }, 0);
    });

    // 显示预览区域
    coverPreview.style.display = 'block';
    coverPreview.style.animation = 'fadeIn 0.5s ease-out';

    // 默认选中第一张
    selectCover(0);
}

/**
 * 选择封面
 */
function selectCover(index) {
    selectedCoverIndex = index;

    // 更新选中状态
    const items = document.querySelectorAll('.cover-item');
    items.forEach((item, i) => {
        if (i === index) {
            item.classList.add('selected');
        } else {
            item.classList.remove('selected');
        }
    });
}

/**
 * 下载选中的封面
 */
function downloadSelected() {
    if (selectedCoverIndex === -1 || !currentCovers[selectedCoverIndex]) {
        showToast('请先选择一张封面', 'error');
        return;
    }

    const cover = currentCovers[selectedCoverIndex];
    const quality = QUALITY_SETTINGS[cover.quality];

    // 创建下载链接
    const link = document.createElement('a');
    const timestamp = new Date().getTime();
    const fileName = `威软封面_${quality.name}_${timestamp}.jpg`;

    link.href = cover.data;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // 记录下载
    const currentUser = UserManager.getCurrentUser();
    if (currentUser) {
        HistoryManager.addDownloadRecord(currentUser.id, {
            coverName: fileName,
            quality: cover.quality
        });
        StatsManager.incrementDownloadCount(currentUser.id);
    }

    showToast('封面下载成功！', 'success');
}

/**
 * 重置上传
 */
function resetUpload() {
    const coverPreview = document.getElementById('coverPreview');
    const uploadZone = document.getElementById('uploadZone');
    const videoInput = document.getElementById('videoInput');

    // 清空输入
    videoInput.value = '';

    // 重置状态
    currentVideo = null;
    currentCovers = [];
    selectedCoverIndex = -1;

    // 显示上传区域
    uploadZone.style.display = 'flex';
    coverPreview.style.display = 'none';
}

/**
 * 获取选中的质量
 */
function getSelectedQuality() {
    const selected = document.querySelector('input[name="quality"]:checked');
    return selected ? selected.value : 'high';
}

/**
 * 显示进度条
 */
function showProgress() {
    const progressBar = document.getElementById('progressBar');
    const uploadZone = document.getElementById('uploadZone');

    uploadZone.style.display = 'none';
    progressBar.style.display = 'block';
    updateProgress(0, '准备中...');
}

/**
 * 更新进度
 */
function updateProgress(percent, text) {
    const progressFill = document.querySelector('.progress-fill');
    const progressText = document.querySelector('.progress-text');

    if (progressFill) {
        progressFill.style.width = percent + '%';
    }

    if (progressText) {
        progressText.textContent = text;
    }
}

/**
 * 隐藏进度条
 */
function hideProgress() {
    const progressBar = document.getElementById('progressBar');
    progressBar.style.display = 'none';
}

/**
 * 拖拽上传支持
 */
function initDragAndDrop() {
    const uploadZone = document.getElementById('uploadZone');
    if (!uploadZone) return;

    uploadZone.addEventListener('dragover', function(e) {
        e.preventDefault();
        e.stopPropagation();
        this.classList.add('dragging');
    });

    uploadZone.addEventListener('dragleave', function(e) {
        e.preventDefault();
        e.stopPropagation();
        this.classList.remove('dragging');
    });

    uploadZone.addEventListener('drop', function(e) {
        e.preventDefault();
        e.stopPropagation();
        this.classList.remove('dragging');

        const files = e.dataTransfer.files;
        if (files.length > 0) {
            const file = files[0];
            if (file.type.startsWith('video/')) {
                // 模拟文件输入
                const videoInput = document.getElementById('videoInput');
                const dataTransfer = new DataTransfer();
                dataTransfer.items.add(file);
                videoInput.files = dataTransfer.files;

                // 触发上传
                handleVideoUpload({ target: videoInput });
            } else {
                showToast('请上传视频文件', 'error');
            }
        }
    });
}

/**
 * 页面加载时初始化拖拽功能
 */
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initDragAndDrop);
} else {
    initDragAndDrop();
}
