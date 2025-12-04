/**
 * 生成預設帳號的密碼 hash
 */

const bcrypt = require('bcrypt');

async function generateHashes() {
    console.log('生成預設帳號密碼 hash...\n');

    // admin / 123
    const adminHash = await bcrypt.hash('123', 10);
    console.log('admin (密碼: 123):');
    console.log(adminHash);
    console.log('');

    // 學生帳號 01~12
    for (let i = 1; i <= 12; i++) {
        const num = String(i).padStart(2, '0');
        const hash = await bcrypt.hash(num, 10);
        console.log(`用戶 ${num} (密碼: ${num}):`);
        console.log(hash);
    }
}

generateHashes().catch(console.error);
