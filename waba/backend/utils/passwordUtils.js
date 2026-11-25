export const hasEmailFiveCharOverlap = (password, email) => {
    const pw = String(password || '').toLowerCase();
    const em = String(email || '').trim().toLowerCase();
    if (!pw || !em || pw.length < 5 || em.length < 5) {
        return false;
    }
    for (let i = 0; i <= em.length - 5; i++) {
        if (pw.includes(em.slice(i, i + 5))) {
            return true;
        }
    }
    return false;
};

export const validatePasswordPolicy = (password, email) => {
    const raw = typeof password === 'string' ? password : '';
    const checks = {
        minLength: raw.length >= 8,
        hasLetter: /[A-Za-z]/.test(raw),
        hasNumber: /[0-9]/.test(raw),
        hasSpecial: /[^A-Za-z0-9\s]/.test(raw),
        noEmailOverlap: !hasEmailFiveCharOverlap(raw, email)
    };

    if (!checks.minLength || !checks.hasLetter || !checks.hasNumber || !checks.hasSpecial) {
        return {
            valid: false,
            code: 'INVALID_PASSWORD_FORMAT',
            message: '비밀번호는 8자 이상이며 영문, 숫자, 특수문자를 모두 포함해야 합니다.',
            checks
        };
    }

    if (!checks.noEmailOverlap) {
        return {
            valid: false,
            code: 'PASSWORD_EMAIL_OVERLAP',
            message: '비밀번호는 아이디(이메일)와 5자 이상 동일할 수 없습니다.',
            checks
        };
    }

    return {
        valid: true,
        code: null,
        message: null,
        checks
    };
};
