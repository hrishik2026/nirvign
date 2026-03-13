const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const INDIAN_PHONE_REGEX = /^\+91\s?[6-9]\d{9}$/;

export function isValidEmail(email: string): boolean {
  return EMAIL_REGEX.test(email.trim());
}

export function isValidIndianPhone(phone: string): boolean {
  return INDIAN_PHONE_REGEX.test(phone.replace(/[\s\-()]/g, ''));
}

export function formatIndianPhone(phone: string): string {
  // Strip everything except digits and +
  let digits = phone.replace(/[^\d+]/g, '');
  // If user typed just digits starting with 6-9, prepend +91
  if (/^[6-9]\d{0,9}$/.test(digits)) {
    digits = '+91' + digits;
  }
  // If starts with 91 but no +, add it
  if (/^91[6-9]/.test(digits)) {
    digits = '+' + digits;
  }
  // Format as +91 XXXXX XXXXX
  const match = digits.match(/^(\+91)(\d{0,5})(\d{0,5})$/);
  if (match) {
    return [match[1], match[2], match[3]].filter(Boolean).join(' ');
  }
  return phone;
}
