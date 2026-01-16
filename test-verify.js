#!/usr/bin/env node

/**
 * 威软视频封面提取器 - 文件大小限制验证脚本
 *
 * 使用方法: node test-verify.js
 */

const fs = require('fs');
const path = require('path');

// ANSI 颜色代码
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
    bold: '\x1b[1m'
};

console.log(`${colors.bold}${colors.blue}
╔══════════════════════════════════════════════════════════╗
║     威软视频封面提取器 - 文件大小限制验证             ║
╚══════════════════════════════════════════════════════════╝
${colors.reset}`);

// 读取 video.js 文件
const videoJsPath = path.join(__dirname, 'js', 'video.js');
let videoJsContent;

try {
    videoJsContent = fs.readFileSync(videoJsPath, 'utf8');
} catch (error) {
    console.error(`${colors.red}✗ 无法读取 video.js 文件${colors.reset}`);
    console.error(error.message);
    process.exit(1);
}

// 测试用例
const testCases = [
    { name: '零字节文件', size: 0, expected: false },
    { name: '10 MB 文件', size: 10 * 1024 * 1024, expected: true },
    { name: '100 MB 文件', size: 100 * 1024 * 1024, expected: true },
    { name: '500 MB 文件', size: 500 * 1024 * 1024, expected: true },
    { name: '1 GB 文件', size: 1 * 1024 * 1024 * 1024, expected: true },
    { name: '2 GB 文件', size: 2 * 1024 * 1024 * 1024, expected: true },
    { name: '3 GB 文件', size: 3 * 1024 * 1024 * 1024, expected: true },
    { name: '4 GB 文件', size: 4 * 1024 * 1024 * 1024, expected: true },
    { name: '4 GB + 1 字节', size: 4 * 1024 * 1024 * 1024 + 1, expected: false },
    { name: '5 GB 文件', size: 5 * 1024 * 1024 * 1024, expected: false },
];

/**
 * 格式化文件大小
 */
function formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

/**
 * 检查代码中的文件大小限制
 */
function checkCodeLimit() {
    console.log(`${colors.cyan}📄 检查代码配置...${colors.reset}\n`);

    // 查找 maxSize 定义
    const maxSizeMatch = videoJsContent.match(/const\s+maxSize\s*=\s*(\d+)\s*\*\s*(\d+)\s*\*\s*(\d+)\s*\*\s*(\d+)/);

    if (!maxSizeMatch) {
        console.error(`${colors.red}✗ 无法在代码中找到 maxSize 定义${colors.reset}`);
        return null;
    }

    const maxSize = parseInt(maxSizeMatch[1]) * parseInt(maxSizeMatch[2]) * parseInt(maxSizeMatch[3]) * parseInt(maxSizeMatch[4]);
    const expectedMaxSize = 4 * 1024 * 1024 * 1024; // 4GB

    console.log(`  发现的限制值: ${formatFileSize(maxSize)} (${maxSize.toLocaleString()} 字节)`);
    console.log(`  预期的限制值: ${formatFileSize(expectedMaxSize)} (${expectedMaxSize.toLocaleString()} 字节)`);

    if (maxSize === expectedMaxSize) {
        console.log(`  ${colors.green}✓ 代码限制值正确${colors.reset}\n`);
    } else {
        console.log(`  ${colors.red}✗ 代码限制值不正确！${colors.reset}\n`);
        return null;
    }

    // 检查错误消息
    const errorMessageMatch = videoJsContent.match(/视频文件不能超过\s*(\d+)\s*GB/);

    if (errorMessageMatch) {
        const errorGB = parseInt(errorMessageMatch[1]);
        console.log(`  错误消息中的限制: ${errorGB} GB`);

        if (errorGB === 4) {
            console.log(`  ${colors.green}✓ 错误消息正确${colors.reset}\n`);
        } else {
            console.log(`  ${colors.red}✗ 错误消息不正确！${colors.reset}\n`);
        }
    }

    return maxSize;
}

/**
 * 模拟文件大小验证
 */
function validateFileSize(fileSize, maxSize) {
    if (fileSize <= 0) {
        return { valid: false, reason: '文件大小无效' };
    }

    if (fileSize > maxSize) {
        return { valid: false, reason: '文件大小超过限制' };
    }

    return { valid: true, reason: '文件大小符合要求' };
}

/**
 * 运行测试
 */
function runTests(maxSize) {
    console.log(`${colors.cyan}🧪 运行验证测试...${colors.reset}\n`);

    let passCount = 0;
    let failCount = 0;

    testCases.forEach((testCase, index) => {
        const result = validateFileSize(testCase.size, maxSize);
        const passed = result.valid === testCase.expected;

        if (passed) {
            passCount++;
            console.log(`  ${colors.green}✓${colors.reset} 测试 ${index + 1}: ${testCase.name} (${formatFileSize(testCase.size)})`);
        } else {
            failCount++;
            console.log(`  ${colors.red}✗${colors.reset} 测试 ${index + 1}: ${testCase.name} (${formatFileSize(testCase.size)})`);
            console.log(`    预期: ${testCase.expected ? '通过' : '拒绝'}, 实际: ${result.valid ? '通过' : '拒绝'}`);
        }
    });

    console.log();
    console.log(`${colors.bold}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
    console.log(`${colors.bold}测试摘要:${colors.reset}`);
    console.log(`  总计: ${testCases.length} 个测试`);
    console.log(`  ${colors.green}通过: ${passCount}${colors.reset}`);
    console.log(`  ${failCount > 0 ? colors.red : colors.green}失败: ${failCount}${colors.reset}`);
    console.log(`  成功率: ${Math.round(passCount / testCases.length * 100)}%`);
    console.log(`${colors.bold}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);

    if (failCount === 0) {
        console.log(`\n${colors.green}${colors.bold}🎉 所有测试通过！文件大小限制已正确设置为 4GB${colors.reset}\n`);
        return true;
    } else {
        console.log(`\n${colors.red}${colors.bold}⚠️  存在 ${failCount} 个测试失败${colors.reset}\n`);
        return false;
    }
}

// 主流程
const maxSize = checkCodeLimit();

if (maxSize) {
    const allPassed = runTests(maxSize);
    process.exit(allPassed ? 0 : 1);
} else {
    console.error(`${colors.red}${colors.bold}验证失败：代码配置有误${colors.reset}\n`);
    process.exit(1);
}
