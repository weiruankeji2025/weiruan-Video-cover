/**
 * 威软视频封面提取器 - 认证模块
 * 处理登录、注册、验证码等功能
 */

// 验证码存储
let captchaCode = {
    login: '',
    register: ''
};

/**
 * 页面加载完成后初始化
 */
document.addEventListener('DOMContentLoaded', function() {
    // 生成验证码
    refreshCaptcha('login');
    refreshCaptcha('register');

    // 检查是否已登录
    checkLoginStatus();
});

/**
 * 检查登录状态
 */
function checkLoginStatus() {
    const currentUser = UserManager.getCurrentUser();
    if (currentUser) {
        // 已登录，跳转到主应用
        window.location.href = 'app.html';
    }
}

/**
 * 切换表单（登录/注册）
 */
function switchForm(formType) {
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');

    if (formType === 'login') {
        loginForm.style.display = 'block';
        registerForm.style.display = 'none';
        refreshCaptcha('login');
    } else {
        loginForm.style.display = 'none';
        registerForm.style.display = 'block';
        refreshCaptcha('register');
    }
}

/**
 * 切换注册类型（邮箱/手机）
 */
function switchRegisterType(type) {
    const emailRegister = document.getElementById('emailRegister');
    const phoneRegister = document.getElementById('phoneRegister');
    const tabs = document.querySelectorAll('.tab-btn');

    if (type === 'email') {
        emailRegister.style.display = 'block';
        phoneRegister.style.display = 'none';
        tabs[0].classList.add('active');
        tabs[1].classList.remove('active');
    } else {
        emailRegister.style.display = 'none';
        phoneRegister.style.display = 'block';
        tabs[0].classList.remove('active');
        tabs[1].classList.add('active');
    }
}

/**
 * 生成验证码
 */
function generateCaptcha() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // 排除容易混淆的字符
    let code = '';
    for (let i = 0; i < 4; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

/**
 * 绘制验证码
 */
function drawCaptcha(canvasId, code) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    // 清空画布
    ctx.clearRect(0, 0, width, height);

    // 背景渐变
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, 'rgba(102, 126, 234, 0.1)');
    gradient.addColorStop(1, 'rgba(118, 75, 162, 0.1)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // 干扰线
    for (let i = 0; i < 3; i++) {
        ctx.strokeStyle = `rgba(${Math.random() * 100 + 100}, ${Math.random() * 100 + 100}, ${Math.random() * 100 + 150}, 0.3)`;
        ctx.beginPath();
        ctx.moveTo(Math.random() * width, Math.random() * height);
        ctx.lineTo(Math.random() * width, Math.random() * height);
        ctx.lineWidth = 1;
        ctx.stroke();
    }

    // 绘制验证码字符
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 24px Arial';

    for (let i = 0; i < code.length; i++) {
        const char = code[i];
        const x = 20 + i * 25;
        const y = height / 2;

        // 随机旋转
        const rotation = (Math.random() - 0.5) * 0.4;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(rotation);

        // 随机颜色
        const hue = Math.random() * 60 + 220; // 蓝紫色系
        ctx.fillStyle = `hsl(${hue}, 70%, 60%)`;
        ctx.fillText(char, 0, 0);

        ctx.restore();
    }

    // 干扰点
    for (let i = 0; i < 30; i++) {
        ctx.fillStyle = `rgba(${Math.random() * 255}, ${Math.random() * 255}, ${Math.random() * 255}, 0.3)`;
        ctx.fillRect(Math.random() * width, Math.random() * height, 2, 2);
    }
}

/**
 * 刷新验证码
 */
function refreshCaptcha(type) {
    const code = generateCaptcha();
    captchaCode[type] = code;

    const canvasId = type === 'login' ? 'loginCaptchaCanvas' : 'registerCaptchaCanvas';
    drawCaptcha(canvasId, code);
}

/**
 * 验证邮箱格式
 */
function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

/**
 * 验证手机号格式
 */
function validatePhone(phone) {
    const re = /^1[3-9]\d{9}$/;
    return re.test(phone);
}

/**
 * 验证密码格式
 */
function validatePassword(password) {
    return password.length >= 6 && password.length <= 20;
}

/**
 * 显示消息提示
 */
function showMessage(message, type = 'info') {
    // 创建临时提示元素
    const toast = document.createElement('div');
    toast.className = `toast show ${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);

    // 3秒后移除
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            document.body.removeChild(toast);
        }, 300);
    }, 3000);
}

/**
 * 处理登录
 */
function handleLogin() {
    const account = document.getElementById('loginAccount').value.trim();
    const password = document.getElementById('loginPassword').value;
    const captcha = document.getElementById('loginCaptcha').value.trim().toUpperCase();

    // 验证输入
    if (!account) {
        showMessage('请输入邮箱或手机号', 'error');
        return;
    }

    if (!password) {
        showMessage('请输入密码', 'error');
        return;
    }

    if (!captcha) {
        showMessage('请输入验证码', 'error');
        return;
    }

    // 验证验证码
    if (captcha !== captchaCode.login) {
        showMessage('验证码错误', 'error');
        refreshCaptcha('login');
        document.getElementById('loginCaptcha').value = '';
        return;
    }

    // 执行登录
    const result = UserManager.loginUser(account, password);

    if (result.success) {
        showMessage('登录成功！', 'success');
        // 延迟跳转，让用户看到成功提示
        setTimeout(() => {
            window.location.href = 'app.html';
        }, 1000);
    } else {
        showMessage(result.message, 'error');
        refreshCaptcha('login');
        document.getElementById('loginCaptcha').value = '';
    }
}

/**
 * 处理注册
 */
function handleRegister() {
    const username = document.getElementById('registerUsername').value.trim();
    const email = document.getElementById('registerEmail').value.trim();
    const phone = document.getElementById('registerPhone').value.trim();
    const password = document.getElementById('registerPassword').value;
    const confirmPassword = document.getElementById('registerConfirmPassword').value;
    const captcha = document.getElementById('registerCaptcha').value.trim().toUpperCase();

    // 判断注册类型
    const isEmailRegister = document.getElementById('emailRegister').style.display !== 'none';
    const account = isEmailRegister ? email : phone;

    // 验证输入
    if (!account) {
        showMessage(isEmailRegister ? '请输入邮箱地址' : '请输入手机号码', 'error');
        return;
    }

    if (isEmailRegister && !validateEmail(account)) {
        showMessage('邮箱格式不正确', 'error');
        return;
    }

    if (!isEmailRegister && !validatePhone(account)) {
        showMessage('手机号格式不正确', 'error');
        return;
    }

    if (!username) {
        showMessage('请输入用户名', 'error');
        return;
    }

    if (username.length < 2 || username.length > 20) {
        showMessage('用户名长度应在2-20位之间', 'error');
        return;
    }

    if (!password) {
        showMessage('请输入密码', 'error');
        return;
    }

    if (!validatePassword(password)) {
        showMessage('密码长度应在6-20位之间', 'error');
        return;
    }

    if (password !== confirmPassword) {
        showMessage('两次密码输入不一致', 'error');
        return;
    }

    if (!captcha) {
        showMessage('请输入验证码', 'error');
        return;
    }

    // 验证验证码
    if (captcha !== captchaCode.register) {
        showMessage('验证码错误', 'error');
        refreshCaptcha('register');
        document.getElementById('registerCaptcha').value = '';
        return;
    }

    // 执行注册
    const userData = {
        username: username,
        password: password
    };

    if (isEmailRegister) {
        userData.email = account;
    } else {
        userData.phone = account;
    }

    const result = UserManager.registerUser(userData);

    if (result.success) {
        showMessage('注册成功！即将跳转到登录页...', 'success');
        // 延迟切换到登录页
        setTimeout(() => {
            switchForm('login');
            // 自动填充账号
            document.getElementById('loginAccount').value = account;
        }, 1500);
    } else {
        showMessage(result.message, 'error');
        refreshCaptcha('register');
        document.getElementById('registerCaptcha').value = '';
    }
}

/**
 * 回车键登录
 */
document.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        const loginForm = document.getElementById('loginForm');
        const registerForm = document.getElementById('registerForm');

        if (loginForm && loginForm.style.display !== 'none') {
            handleLogin();
        } else if (registerForm && registerForm.style.display !== 'none') {
            handleRegister();
        }
    }
});
