export const generateUserId = (email) => {
    const random3 = Math.floor(100 + Math.random() * 900);
    const now = new Date();

    const yy = String(now.getFullYear()).slice(-2);
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const hh = String(now.getHours()).padStart(2, '0');
    const min = String(now.getMinutes()).padStart(2, '0');
    const prefixEmail = email.replace(/[^a-zA-Z0-9]/g, '').slice(0, 3).padEnd(3, 'x');
    return `${random3}${yy}${mm}${dd}${hh}${min}${prefixEmail}`;
};

export const generateIdentityId = () => {
    const random3 = Math.floor(100 + Math.random() * 900);
    const now = new Date();
    const yy = String(now.getFullYear()).slice(-2);
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const hh = String(now.getHours()).padStart(2, '0');
    const min = String(now.getMinutes()).padStart(2, '0');
    return `IDN${random3}${yy}${mm}${dd}${hh}${min}`;
};

export const generateCommentId = () => {
    const random3 = Math.floor(100 + Math.random() * 900);
    const now = new Date();
    const yy = String(now.getFullYear()).slice(-2);
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const hh = String(now.getHours()).padStart(2, '0');
    const min = String(now.getMinutes()).padStart(2, '0');
    const ss = String(now.getSeconds()).padStart(2, '0');
    return `C${random3}${yy}${mm}${dd}${hh}${min}${ss}`.slice(0, 20);
};

export const generatePostId = () => {
    const random3 = Math.floor(100 + Math.random() * 900);
    const now = new Date();
    const yy = String(now.getFullYear()).slice(-2);
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const hh = String(now.getHours()).padStart(2, '0');
    const min = String(now.getMinutes()).padStart(2, '0');
    const ss = String(now.getSeconds()).padStart(2, '0');
    return `P${random3}${yy}${mm}${dd}${hh}${min}${ss}`.slice(0, 20);
};
