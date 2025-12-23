/**
 * Validate required fields in request body
 * @param body - Request body object
 * @param requiredFields - Array of required field names
 * @returns Validation result
 */
export const validateRequired = (
  body: any,
  requiredFields: string[]
): { valid: boolean; missing?: string[] } => {
  const missing = requiredFields.filter(
    (field) => !body[field] || (typeof body[field] === 'string' && body[field].trim() === '')
  );
  return {
    valid: missing.length === 0,
    missing: missing.length > 0 ? missing : undefined,
  };
};

/**
 * Validate ID format (UUID)
 * @param id - ID to validate
 * @returns Validation result
 */
export const isValidUUID = (id: string): boolean => {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
};

/**
 * Validate email format
 * @param email - Email to validate
 * @returns Validation result
 */
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate handle format (alphanumeric, underscore, lowercase)
 * @param handle - Handle to validate
 * @returns Validation result
 */
export const isValidHandle = (handle: string): boolean => {
  const handleRegex = /^[a-z0-9_]{3,30}$/;
  return handleRegex.test(handle);
};
