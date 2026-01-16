/**
 * 威软视频封面提取器 - 主应用模块
 * 处理签到、面板、历史记录等功能
 */

// 当前用户
let currentUser = null;

/**
 * 页面加载完成后初始化
 */
document.addEventListener('DOMContentLoaded', function() {
    // 检查登录状态
    currentUser = UserManager.getCurrentUser();
    if (!currentUser) {
        // 未登录，跳转到登录页
        window.location.href = 'index.html';
        return;
    }

    // 初始化页面
    initApp();
});

/**
 * 初始化应用
 */
function initApp() {
    // 显示用户名
    document.getElementById('username').textContent = currentUser.username;

    // 初始化签到状态
    initCheckin();

    // 初始化面板数据
    initDashboard();

    // 记录开始时间（用于统计使用时长）
    sessionStorage.setItem('startTime', Date.now());
}

/**
 * 初始化签到
 */
function initCheckin() {
    const checkinData = CheckinManager.getUserCheckinData(currentUser.id);
    const hasCheckedIn = CheckinManager.hasCheckedInToday(currentUser.id);

    // 更新签到天数显示
    document.getElementById('consecutiveDays').textContent = checkinData.consecutiveDays;

    // 更新签到按钮状态
    const checkinBtn = document.getElementById('checkinBtn');
    if (hasCheckedIn) {
        checkinBtn.disabled = true;
        checkinBtn.innerHTML = '<span>已签到</span>';
    }
}

/**
 * 处理签到
 */
function handleCheckin() {
    const result = CheckinManager.checkin(currentUser.id);

    if (result.success) {
        // 更新显示
        document.getElementById('consecutiveDays').textContent = result.consecutiveDays;

        // 更新按钮状态
        const checkinBtn = document.getElementById('checkinBtn');
        checkinBtn.disabled = true;
        checkinBtn.innerHTML = '<span>已签到</span>';

        // 显示成功提示
        showToast(`签到成功！已连续签到 ${result.consecutiveDays} 天`, 'success');

        // 刷新面板数据
        updateDashboardStats();
    } else {
        showToast(result.message, 'error');
    }
}

/**
 * 切换标签页
 */
function switchTab(tab) {
    const sections = document.querySelectorAll('.section');
    const navLinks = document.querySelectorAll('.nav-link');

    sections.forEach(section => {
        section.classList.remove('active');
    });

    navLinks.forEach(link => {
        link.classList.remove('active');
    });

    if (tab === 'upload') {
        document.getElementById('uploadSection').classList.add('active');
        navLinks[0].classList.add('active');
    } else if (tab === 'dashboard') {
        document.getElementById('dashboardSection').classList.add('active');
        navLinks[1].classList.add('active');
        // 刷新面板数据
        updateDashboard();
    }
}

/**
 * 初始化个人面板
 */
function initDashboard() {
    updateDashboardStats();
    drawTrendChart();
    loadHistory('upload');
}

/**
 * 更新面板统计数据
 */
function updateDashboardStats() {
    const stats = StatsManager.getUserStats(currentUser.id);
    const checkinData = CheckinManager.getUserCheckinData(currentUser.id);

    // 更新统计卡片
    document.getElementById('uploadCount').textContent = stats.uploadCount;
    document.getElementById('downloadCount').textContent = stats.downloadCount;
    document.getElementById('dashboardDays').textContent = checkinData.consecutiveDays;
    document.getElementById('totalTime').textContent = stats.totalTime;
}

/**
 * 更新整个面板
 */
function updateDashboard() {
    updateDashboardStats();
    drawTrendChart();

    // 刷新当前显示的历史记录
    const activeTab = document.querySelector('.history-tab.active');
    if (activeTab) {
        const type = activeTab.textContent.includes('上传') ? 'upload' : 'download';
        loadHistory(type);
    }
}

/**
 * 绘制趋势图
 */
function drawTrendChart() {
    const canvas = document.getElementById('trendChart');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const stats = StatsManager.getUserStats(currentUser.id);

    // 清空画布
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 获取最近7天的数据
    const today = new Date();
    const last7Days = [];
    const uploadData = [];
    const downloadData = [];

    for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateStr = date.toDateString();

        last7Days.push(dateStr);

        // 查找对应日期的统计
        const dayStats = stats.dailyStats.find(s => s.date === dateStr);
        uploadData.push(dayStats ? dayStats.uploadCount : 0);
        downloadData.push(dayStats ? dayStats.downloadCount : 0);
    }

    // 绘制参数
    const padding = 40;
    const chartWidth = canvas.width - padding * 2;
    const chartHeight = canvas.height - padding * 2;
    const maxValue = Math.max(...uploadData, ...downloadData, 5); // 最小值为5
    const xStep = chartWidth / 6;
    const yStep = chartHeight / maxValue;

    // 绘制背景网格
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;

    for (let i = 0; i <= 5; i++) {
        const y = padding + (chartHeight / 5) * i;
        ctx.beginPath();
        ctx.moveTo(padding, y);
        ctx.lineTo(canvas.width - padding, y);
        ctx.stroke();
    }

    // 绘制Y轴标签
    ctx.fillStyle = '#a0a0c0';
    ctx.font = '12px Arial';
    ctx.textAlign = 'right';

    for (let i = 0; i <= 5; i++) {
        const value = Math.round((maxValue / 5) * (5 - i));
        const y = padding + (chartHeight / 5) * i;
        ctx.fillText(value.toString(), padding - 10, y + 4);
    }

    // 绘制上传数据折线
    drawLine(ctx, uploadData, padding, chartHeight, xStep, yStep, '#667eea');

    // 绘制下载数据折线
    drawLine(ctx, downloadData, padding, chartHeight, xStep, yStep, '#f5576c');

    // 绘制X轴标签
    ctx.fillStyle = '#a0a0c0';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';

    last7Days.forEach((dateStr, index) => {
        const date = new Date(dateStr);
        const label = `${date.getMonth() + 1}/${date.getDate()}`;
        const x = padding + xStep * index;
        ctx.fillText(label, x, canvas.height - padding + 20);
    });

    // 绘制图例
    const legendY = 20;
    const legendX = canvas.width - 150;

    ctx.fillStyle = '#667eea';
    ctx.fillRect(legendX, legendY, 20, 3);
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'left';
    ctx.fillText('上传次数', legendX + 25, legendY + 4);

    ctx.fillStyle = '#f5576c';
    ctx.fillRect(legendX, legendY + 20, 20, 3);
    ctx.fillStyle = '#ffffff';
    ctx.fillText('下载次数', legendX + 25, legendY + 24);
}

/**
 * 绘制折线
 */
function drawLine(ctx, data, padding, chartHeight, xStep, yStep, color) {
    // 绘制区域填充
    const gradient = ctx.createLinearGradient(0, padding, 0, padding + chartHeight);
    gradient.addColorStop(0, color + '40');
    gradient.addColorStop(1, color + '00');

    ctx.beginPath();
    ctx.moveTo(padding, padding + chartHeight);

    data.forEach((value, index) => {
        const x = padding + xStep * index;
        const y = padding + chartHeight - value * yStep;
        ctx.lineTo(x, y);
    });

    ctx.lineTo(padding + xStep * (data.length - 1), padding + chartHeight);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();

    // 绘制折线
    ctx.beginPath();
    data.forEach((value, index) => {
        const x = padding + xStep * index;
        const y = padding + chartHeight - value * yStep;

        if (index === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    });

    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.stroke();

    // 绘制数据点
    data.forEach((value, index) => {
        const x = padding + xStep * index;
        const y = padding + chartHeight - value * yStep;

        ctx.beginPath();
        ctx.arc(x, y, 5, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
    });
}

/**
 * 切换历史记录标签
 */
function switchHistory(type) {
    const tabs = document.querySelectorAll('.history-tab');
    tabs.forEach(tab => {
        tab.classList.remove('active');
    });

    if (type === 'upload') {
        tabs[0].classList.add('active');
    } else {
        tabs[1].classList.add('active');
    }

    loadHistory(type);
}

/**
 * 加载历史记录
 */
function loadHistory(type) {
    const historyContent = document.getElementById('historyContent');
    let history = [];

    if (type === 'upload') {
        history = HistoryManager.getUploadHistory(currentUser.id);
    } else {
        history = HistoryManager.getDownloadHistory(currentUser.id);
    }

    // 清空内容
    historyContent.innerHTML = '';

    if (history.length === 0) {
        historyContent.innerHTML = '<div class="history-empty">暂无记录</div>';
        return;
    }

    // 创建历史记录项
    history.forEach(record => {
        const item = document.createElement('div');
        item.className = 'history-item';

        const info = document.createElement('div');
        info.className = 'history-info';

        const name = document.createElement('div');
        name.className = 'history-name';

        if (type === 'upload') {
            name.textContent = record.fileName;
        } else {
            name.textContent = record.coverName;
        }

        const time = document.createElement('div');
        time.className = 'history-time';
        time.textContent = Utils.formatDateTime(type === 'upload' ? record.uploadTime : record.downloadTime);

        info.appendChild(name);
        info.appendChild(time);

        const quality = document.createElement('div');
        quality.className = 'history-quality';
        quality.textContent = QUALITY_SETTINGS[record.quality].name;

        item.appendChild(info);
        item.appendChild(quality);

        historyContent.appendChild(item);
    });
}

/**
 * 退出登录
 */
function handleLogout() {
    // 计算使用时长
    const startTime = sessionStorage.getItem('startTime');
    if (startTime) {
        const duration = Date.now() - parseInt(startTime);
        const minutes = Math.round(duration / 60000);
        if (minutes > 0) {
            StatsManager.addUsageTime(currentUser.id, minutes);
        }
    }

    // 清除登录状态
    UserManager.logout();

    // 跳转到登录页
    window.location.href = 'index.html';
}

/**
 * 显示 Toast 提示
 */
function showToast(message, type = 'info') {
    let toast = document.getElementById('toast');

    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'toast';
        toast.className = 'toast';
        document.body.appendChild(toast);
    }

    toast.textContent = message;
    toast.className = `toast show ${type}`;

    // 3秒后隐藏
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

/**
 * 在窗口关闭前保存使用时长
 */
window.addEventListener('beforeunload', function() {
    const startTime = sessionStorage.getItem('startTime');
    if (startTime && currentUser) {
        const duration = Date.now() - parseInt(startTime);
        const minutes = Math.round(duration / 60000);
        if (minutes > 0) {
            StatsManager.addUsageTime(currentUser.id, minutes);
        }
    }
});
