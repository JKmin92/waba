export interface PasswordPolicyChecks {
    minLength: boolean;
    hasLetter: boolean;
    hasNumber: boolean;
    hasSpecial: boolean;
    noEmailOverlap: boolean;
}

export interface PasswordStrengthResult {
    checks: PasswordPolicyChecks;
    isValid: boolean;
    score: 0 | 1 | 2 | 3 | 4;
    label: string;
    color: string;
    errorMessage: string | null;
}

export function hasEmailFiveCharOverlap(password: string, email?: string | null): boolean {
    if (!password || !email) return false;
    const cleanEmail = email.trim().toLowerCase();
    const cleanPw = password.toLowerCase();
    if (cleanEmail.length < 5 || cleanPw.length < 5) return false;

    for (let i = 0; i <= cleanEmail.length - 5; i++) {
        const sub = cleanEmail.slice(i, i + 5);
        if (cleanPw.includes(sub)) {
            return true;
        }
    }
    return false;
}

export function evaluatePasswordStrength(
    password: string,
    email?: string | null
): PasswordStrengthResult {
    const minLength = password.length >= 8;
    const hasLetter = /[A-Za-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecial = /[^A-Za-z0-9\s]/.test(password);
    const noEmailOverlap = !hasEmailFiveCharOverlap(password, email);

    const checks: PasswordPolicyChecks = {
        minLength,
        hasLetter,
        hasNumber,
        hasSpecial,
        noEmailOverlap,
    };

    const isValid = minLength && hasLetter && hasNumber && hasSpecial && noEmailOverlap;

    let errorMessage: string | null = null;
    if (!minLength || !hasLetter || !hasNumber || !hasSpecial) {
        errorMessage = '비밀번호는 8자 이상이며 영문, 숫자, 특수문자를 모두 포함해야 합니다.';
    } else if (!noEmailOverlap) {
        errorMessage = '비밀번호는 아이디(이메일)와 5자 이상 동일할 수 없습니다.';
    }

    if (!password) {
        return {
            checks,
            isValid,
            score: 0,
            label: '',
            color: '#94A3B8',
            errorMessage,
        };
    }

    if (password.length < 4) {
        return {
            checks,
            isValid,
            score: 0,
            label: '너무 짧음',
            color: '#94A3B8',
            errorMessage,
        };
    }

    if (!noEmailOverlap) {
        return {
            checks,
            isValid,
            score: 1,
            label: '이메일과 5자 이상 중복',
            color: '#EF4444',
            errorMessage,
        };
    }

    if (!isValid) {
        const passedCount = [minLength, hasLetter, hasNumber, hasSpecial].filter(Boolean).length;
        if (passedCount >= 3) {
            return {
                checks,
                isValid,
                score: 2,
                label: '보통',
                color: '#F59E0B',
                errorMessage,
            };
        }
        return {
            checks,
            isValid,
            score: 1,
            label: '약함',
            color: '#EF4444',
            errorMessage,
        };
    }

    const hasMixedCase = /[a-z]/.test(password) && /[A-Z]/.test(password);
    if (password.length >= 12 || hasMixedCase) {
        return {
            checks,
            isValid,
            score: 4,
            label: '매우 안전',
            color: '#22C55E',
            errorMessage: null,
        };
    }

    return {
        checks,
        isValid,
        score: 3,
        label: '안전',
        color: '#6338A9',
        errorMessage: null,
    };
}
