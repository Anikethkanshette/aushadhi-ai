/**
 * Validation Utilities
 * Validates user inputs according to rules in config
 */

import { VALIDATION_RULES } from '../config';

/**
 * Validate ABHA ID
 */
export const validateAbhaId = (abhaId) => {
  if (!abhaId) {
    return { valid: false, error: 'ABHA ID is required' };
  }

  if (!VALIDATION_RULES.ABHA_ID.pattern.test(abhaId)) {
    return { valid: false, error: VALIDATION_RULES.ABHA_ID.message };
  }

  return { valid: true };
};

/**
 * Validate phone number
 */
export const validatePhone = (phone) => {
  if (!phone) {
    return { valid: false, error: 'Phone number is required' };
  }

  const phoneStr = phone.toString().replace(/\D/g, '');

  if (phoneStr.length !== 10) {
    return { valid: false, error: VALIDATION_RULES.PHONE.message };
  }

  return { valid: true };
};

/**
 * Validate email
 */
export const validateEmail = (email) => {
  if (!email) {
    return { valid: false, error: 'Email is required' };
  }

  if (!VALIDATION_RULES.EMAIL.pattern.test(email)) {
    return { valid: false, error: VALIDATION_RULES.EMAIL.message };
  }

  return { valid: true };
};

/**
 * Validate password
 */
export const validatePassword = (password) => {
  if (!password) {
    return { valid: false, error: 'Password is required' };
  }

  if (password.length < VALIDATION_RULES.PASSWORD.minLength) {
    return { valid: false, error: VALIDATION_RULES.PASSWORD.message };
  }

  return { valid: true };
};

/**
 * Validate quantity
 */
export const validateQuantity = (quantity) => {
  const num = Number(quantity);

  if (isNaN(num)) {
    return { valid: false, error: 'Quantity must be a number' };
  }

  if (num < VALIDATION_RULES.QUANTITY.min || num > VALIDATION_RULES.QUANTITY.max) {
    return {
      valid: false,
      error: `Quantity must be between ${VALIDATION_RULES.QUANTITY.min} and ${VALIDATION_RULES.QUANTITY.max}`,
    };
  }

  return { valid: true };
};

/**
 * Validate amount
 */
export const validateAmount = (amount) => {
  const num = Number(amount);

  if (isNaN(num)) {
    return { valid: false, error: 'Amount must be a number' };
  }

  if (num < VALIDATION_RULES.AMOUNT.min || num > VALIDATION_RULES.AMOUNT.max) {
    return {
      valid: false,
      error: `Amount must be between ${VALIDATION_RULES.AMOUNT.min} and ${VALIDATION_RULES.AMOUNT.max}`,
    };
  }

  return { valid: true };
};

/**
 * Validate prescription ID
 */
export const validatePrescriptionId = (prescriptionId) => {
  if (!prescriptionId || prescriptionId.trim().length === 0) {
    return { valid: false, error: 'Prescription ID is required' };
  }

  return { valid: true };
};

/**
 * Validate medication name
 */
export const validateMedicationName = (name) => {
  if (!name || name.trim().length === 0) {
    return { valid: false, error: 'Medication name is required' };
  }

  if (name.trim().length < 2) {
    return { valid: false, error: 'Medication name must be at least 2 characters' };
  }

  return { valid: true };
};

/**
 * Validate form object
 */
export const validateForm = (formData, rules) => {
  const errors = {};
  let isValid = true;

  Object.keys(rules).forEach((field) => {
    const validator = rules[field];
    const value = formData[field];
    const result = validator(value);

    if (!result.valid) {
      errors[field] = result.error;
      isValid = false;
    }
  });

  return { isValid, errors };
};

/**
 * Sanitize string input
 */
export const sanitizeString = (input) => {
  if (typeof input !== 'string') return '';
  return input.trim().replace(/[<>]/g, '');
};

/**
 * Format phone for display
 */
export const formatPhoneDisplay = (phone) => {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 10) {
    return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }
  return phone;
};

/**
 * Format ABHA ID for display
 */
export const formatAbhaIdDisplay = (abhaId) => {
  return abhaId || 'N/A';
};

/**
 * Check password strength
 */
export const checkPasswordStrength = (password) => {
  let strength = 0;
  const checks = {
    hasLength: password.length >= 8,
    hasUppercase: /[A-Z]/.test(password),
    hasLowercase: /[a-z]/.test(password),
    hasNumbers: /\d/.test(password),
    hasSpecialChar: /[!@#$%^&*]/.test(password),
  };

  Object.values(checks).forEach((check) => {
    if (check) strength++;
  });

  return {
    score: strength,
    level: strength <= 2 ? 'weak' : strength <= 4 ? 'medium' : 'strong',
    checks,
  };
};
