/**
 * 威软视频封面提取器 - 数据存储模块
 * 使用 localStorage 实现本地数据持久化
 */

// 数据存储键名
const STORAGE_KEYS = {
    USERS: 'weiruan_users',              // 用户列表
    CURRENT_USER: 'weiruan_current_user', // 当前登录用户
    CHECKIN_DATA: 'weiruan_checkin',      // 签到数据
    UPLOAD_HISTORY: 'weiruan_upload',     // 上传历史
    DOWNLOAD_HISTORY: 'weiruan_download', // 下载历史
    STATS: 'weiruan_stats'                // 统计数据
};

/**
 * 存储管理器
 */
const StorageManager = {
    /**
     * 保存数据到 localStorage
     */
    save(key, data) {
        try {
            localStorage.setItem(key, JSON.stringify(data));
            return true;
        } catch (error) {
            console.error('保存数据失败:', error);
            return false;
        }
    },

    /**
     * 从 localStorage 读取数据
     */
    load(key, defaultValue = null) {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : defaultValue;
        } catch (error) {
            console.error('读取数据失败:', error);
            return defaultValue;
        }
    },

    /**
     * 删除数据
     */
    remove(key) {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (error) {
            console.error('删除数据失败:', error);
            return false;
        }
    },

    /**
     * 清空所有数据
     */
    clear() {
        try {
            Object.values(STORAGE_KEYS).forEach(key => {
                localStorage.removeItem(key);
            });
            return true;
        } catch (error) {
            console.error('清空数据失败:', error);
            return false;
        }
    }
};

/**
 * 用户管理
 */
const UserManager = {
    /**
     * 获取所有用户
     */
    getAllUsers() {
        return StorageManager.load(STORAGE_KEYS.USERS, []);
    },

    /**
     * 保存用户列表
     */
    saveUsers(users) {
        return StorageManager.save(STORAGE_KEYS.USERS, users);
    },

    /**
     * 根据账号查找用户
     */
    findUser(account) {
        const users = this.getAllUsers();
        return users.find(user =>
            user.email === account || user.phone === account
        );
    },

    /**
     * 注册新用户
     */
    registerUser(userData) {
        const users = this.getAllUsers();

        // 检查用户是否已存在
        const existingUser = this.findUser(userData.email || userData.phone);
        if (existingUser) {
            return { success: false, message: '该账号已注册' };
        }

        // 创建新用户
        const newUser = {
            id: Date.now().toString(),
            username: userData.username,
            email: userData.email || null,
            phone: userData.phone || null,
            password: userData.password,
            registerTime: new Date().toISOString(),
            lastLoginTime: null
        };

        users.push(newUser);
        this.saveUsers(users);

        return { success: true, user: newUser };
    },

    /**
     * 用户登录
     */
    loginUser(account, password) {
        const user = this.findUser(account);

        if (!user) {
            return { success: false, message: '账号不存在' };
        }

        if (user.password !== password) {
            return { success: false, message: '密码错误' };
        }

        // 更新最后登录时间
        user.lastLoginTime = new Date().toISOString();
        this.updateUser(user);

        // 保存当前用户
        StorageManager.save(STORAGE_KEYS.CURRENT_USER, user);

        return { success: true, user };
    },

    /**
     * 更新用户信息
     */
    updateUser(updatedUser) {
        const users = this.getAllUsers();
        const index = users.findIndex(u => u.id === updatedUser.id);

        if (index !== -1) {
            users[index] = updatedUser;
            this.saveUsers(users);

            // 如果是当前用户，也更新当前用户信息
            const currentUser = this.getCurrentUser();
            if (currentUser && currentUser.id === updatedUser.id) {
                StorageManager.save(STORAGE_KEYS.CURRENT_USER, updatedUser);
            }

            return true;
        }
        return false;
    },

    /**
     * 获取当前登录用户
     */
    getCurrentUser() {
        return StorageManager.load(STORAGE_KEYS.CURRENT_USER);
    },

    /**
     * 退出登录
     */
    logout() {
        return StorageManager.remove(STORAGE_KEYS.CURRENT_USER);
    }
};

/**
 * 签到管理
 */
const CheckinManager = {
    /**
     * 获取用户签到数据
     */
    getUserCheckinData(userId) {
        const allData = StorageManager.load(STORAGE_KEYS.CHECKIN_DATA, {});
        return allData[userId] || {
            consecutiveDays: 0,
            totalDays: 0,
            lastCheckinDate: null,
            checkinHistory: []
        };
    },

    /**
     * 保存签到数据
     */
    saveCheckinData(userId, data) {
        const allData = StorageManager.load(STORAGE_KEYS.CHECKIN_DATA, {});
        allData[userId] = data;
        return StorageManager.save(STORAGE_KEYS.CHECKIN_DATA, allData);
    },

    /**
     * 签到
     */
    checkin(userId) {
        const data = this.getUserCheckinData(userId);
        const today = new Date().toDateString();

        // 检查今天是否已签到
        if (data.lastCheckinDate === today) {
            return { success: false, message: '今天已签到过了' };
        }

        // 检查是否连续签到
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toDateString();

        if (data.lastCheckinDate === yesterdayStr) {
            // 连续签到
            data.consecutiveDays += 1;
        } else if (data.lastCheckinDate === null) {
            // 首次签到
            data.consecutiveDays = 1;
        } else {
            // 中断了，重新开始
            data.consecutiveDays = 1;
        }

        data.totalDays += 1;
        data.lastCheckinDate = today;
        data.checkinHistory.push({
            date: new Date().toISOString(),
            consecutiveDays: data.consecutiveDays
        });

        this.saveCheckinData(userId, data);

        return {
            success: true,
            consecutiveDays: data.consecutiveDays,
            totalDays: data.totalDays
        };
    },

    /**
     * 检查今天是否已签到
     */
    hasCheckedInToday(userId) {
        const data = this.getUserCheckinData(userId);
        const today = new Date().toDateString();
        return data.lastCheckinDate === today;
    }
};

/**
 * 历史记录管理
 */
const HistoryManager = {
    /**
     * 获取上传历史
     */
    getUploadHistory(userId) {
        const allHistory = StorageManager.load(STORAGE_KEYS.UPLOAD_HISTORY, {});
        return allHistory[userId] || [];
    },

    /**
     * 添加上传记录
     */
    addUploadRecord(userId, record) {
        const allHistory = StorageManager.load(STORAGE_KEYS.UPLOAD_HISTORY, {});
        if (!allHistory[userId]) {
            allHistory[userId] = [];
        }

        const uploadRecord = {
            id: Date.now().toString(),
            fileName: record.fileName,
            fileSize: record.fileSize,
            quality: record.quality,
            coverCount: record.coverCount,
            uploadTime: new Date().toISOString()
        };

        allHistory[userId].unshift(uploadRecord); // 最新的在前面

        // 只保留最近100条记录
        if (allHistory[userId].length > 100) {
            allHistory[userId] = allHistory[userId].slice(0, 100);
        }

        StorageManager.save(STORAGE_KEYS.UPLOAD_HISTORY, allHistory);
        return uploadRecord;
    },

    /**
     * 获取下载历史
     */
    getDownloadHistory(userId) {
        const allHistory = StorageManager.load(STORAGE_KEYS.DOWNLOAD_HISTORY, {});
        return allHistory[userId] || [];
    },

    /**
     * 添加下载记录
     */
    addDownloadRecord(userId, record) {
        const allHistory = StorageManager.load(STORAGE_KEYS.DOWNLOAD_HISTORY, {});
        if (!allHistory[userId]) {
            allHistory[userId] = [];
        }

        const downloadRecord = {
            id: Date.now().toString(),
            coverName: record.coverName,
            quality: record.quality,
            downloadTime: new Date().toISOString()
        };

        allHistory[userId].unshift(downloadRecord);

        // 只保留最近100条记录
        if (allHistory[userId].length > 100) {
            allHistory[userId] = allHistory[userId].slice(0, 100);
        }

        StorageManager.save(STORAGE_KEYS.DOWNLOAD_HISTORY, allHistory);
        return downloadRecord;
    }
};

/**
 * 统计数据管理
 */
const StatsManager = {
    /**
     * 获取用户统计数据
     */
    getUserStats(userId) {
        const allStats = StorageManager.load(STORAGE_KEYS.STATS, {});
        return allStats[userId] || {
            uploadCount: 0,
            downloadCount: 0,
            totalTime: 0,
            dailyStats: [] // 每日统计数据，用于趋势图
        };
    },

    /**
     * 保存统计数据
     */
    saveStats(userId, stats) {
        const allStats = StorageManager.load(STORAGE_KEYS.STATS, {});
        allStats[userId] = stats;
        return StorageManager.save(STORAGE_KEYS.STATS, allStats);
    },

    /**
     * 增加上传次数
     */
    incrementUploadCount(userId) {
        const stats = this.getUserStats(userId);
        stats.uploadCount += 1;
        this.updateDailyStats(stats, 'upload');
        this.saveStats(userId, stats);
        return stats.uploadCount;
    },

    /**
     * 增加下载次数
     */
    incrementDownloadCount(userId) {
        const stats = this.getUserStats(userId);
        stats.downloadCount += 1;
        this.updateDailyStats(stats, 'download');
        this.saveStats(userId, stats);
        return stats.downloadCount;
    },

    /**
     * 更新每日统计
     */
    updateDailyStats(stats, type) {
        const today = new Date().toDateString();
        let todayStats = stats.dailyStats.find(s => s.date === today);

        if (!todayStats) {
            todayStats = {
                date: today,
                uploadCount: 0,
                downloadCount: 0
            };
            stats.dailyStats.push(todayStats);
        }

        if (type === 'upload') {
            todayStats.uploadCount += 1;
        } else if (type === 'download') {
            todayStats.downloadCount += 1;
        }

        // 只保留最近30天的数据
        if (stats.dailyStats.length > 30) {
            stats.dailyStats = stats.dailyStats.slice(-30);
        }
    },

    /**
     * 增加使用时长（分钟）
     */
    addUsageTime(userId, minutes) {
        const stats = this.getUserStats(userId);
        stats.totalTime += minutes;
        this.saveStats(userId, stats);
        return stats.totalTime;
    }
};

/**
 * 工具函数
 */
const Utils = {
    /**
     * 格式化文件大小
     */
    formatFileSize(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    },

    /**
     * 格式化日期时间
     */
    formatDateTime(isoString) {
        const date = new Date(isoString);
        const now = new Date();
        const diff = now - date;

        // 一分钟内
        if (diff < 60000) {
            return '刚刚';
        }

        // 一小时内
        if (diff < 3600000) {
            return Math.floor(diff / 60000) + ' 分钟前';
        }

        // 一天内
        if (diff < 86400000) {
            return Math.floor(diff / 3600000) + ' 小时前';
        }

        // 一周内
        if (diff < 604800000) {
            return Math.floor(diff / 86400000) + ' 天前';
        }

        // 显示具体日期
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hour = String(date.getHours()).padStart(2, '0');
        const minute = String(date.getMinutes()).padStart(2, '0');

        return `${year}-${month}-${day} ${hour}:${minute}`;
    },

    /**
     * 生成随机字符串
     */
    generateRandomString(length = 8) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        for (let i = 0; i < length; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }
};
