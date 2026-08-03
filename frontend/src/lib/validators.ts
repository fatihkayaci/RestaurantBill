export const isValidPhone = (value: string) => {
    if (!value.trim()) return true;
    const digits = value.replace(/\D/g, '').replace(/^90/, '').replace(/^0/, '');
    return /^\d{10}$/.test(digits);
};

export const isValidEmail = (value: string) => {
    if (!value.trim()) return true;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
};
