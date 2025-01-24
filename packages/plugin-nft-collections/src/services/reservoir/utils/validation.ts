import { ReservoirValidationError } from "../errors";

export interface ValidationRule<T> {
    validate: (value: T) => boolean;
    message: string;
}

export function validateString(
    value: unknown,
    field: string,
    rules: ValidationRule<string>[] = []
): string {
    if (typeof value !== "string") {
        throw new ReservoirValidationError(field, `${field} must be a string`);
    }

    for (const rule of rules) {
        if (!rule.validate(value)) {
            throw new ReservoirValidationError(field, rule.message);
        }
    }

    return value;
}

export function validateNumber(
    value: unknown,
    field: string,
    rules: ValidationRule<number>[] = []
): number {
    if (typeof value !== "number" || isNaN(value)) {
        throw new ReservoirValidationError(field, `${field} must be a number`);
    }

    for (const rule of rules) {
        if (!rule.validate(value)) {
            throw new ReservoirValidationError(field, rule.message);
        }
    }

    return value;
}

export function validateBoolean(value: unknown, field: string): boolean {
    if (typeof value !== "boolean") {
        throw new ReservoirValidationError(field, `${field} must be a boolean`);
    }

    return value;
}

export function validateArray<T>(
    value: unknown,
    field: string,
    itemValidator: (item: unknown, index: number) => T,
    rules: ValidationRule<T[]>[] = []
): T[] {
    if (!Array.isArray(value)) {
        throw new ReservoirValidationError(field, `${field} must be an array`);
    }

    const validatedArray = value.map((item, index) =>
        itemValidator(item, index)
    );

    for (const rule of rules) {
        if (!rule.validate(validatedArray)) {
            throw new ReservoirValidationError(field, rule.message);
        }
    }

    return validatedArray;
}

export function validateObject<T extends Record<string, unknown>>(
    value: unknown,
    field: string,
    schema: {
        [K in keyof T]: (value: unknown) => T[K];
    }
): T {
    if (typeof value !== "object" || value === null) {
        throw new ReservoirValidationError(field, `${field} must be an object`);
    }

    const result: Partial<T> = {};

    for (const [key, validator] of Object.entries(schema)) {
        try {
            const fieldValue = (value as Record<string, unknown>)[key];
            result[key as keyof T] = validator(fieldValue);
        } catch (error) {
            if (error instanceof ReservoirValidationError) {
                throw new ReservoirValidationError(
                    `${field}.${key}`,
                    error.message,
                    error.details
                );
            }
            throw error;
        }
    }

    return result as T;
}

// Common validation rules
export const required: ValidationRule<string> = {
    validate: (value: string) => value.length > 0,
    message: "Field is required",
};

export const minLength = (min: number): ValidationRule<string> => ({
    validate: (value: string) => value.length >= min,
    message: `Must be at least ${min} characters long`,
});

export const maxLength = (max: number): ValidationRule<string> => ({
    validate: (value: string) => value.length <= max,
    message: `Must be at most ${max} characters long`,
});

export const pattern = (
    regex: RegExp,
    description: string
): ValidationRule<string> => ({
    validate: (value: string) => regex.test(value),
    message: `Must match pattern: ${description}`,
});

export const min = (minimum: number): ValidationRule<number> => ({
    validate: (value: number) => value >= minimum,
    message: `Must be greater than or equal to ${minimum}`,
});

export const max = (maximum: number): ValidationRule<number> => ({
    validate: (value: number) => value <= maximum,
    message: `Must be less than or equal to ${maximum}`,
});

export const maxItems = (max: number): ValidationRule<unknown[]> => ({
    validate: (value: unknown[]) => value.length <= max,
    message: `Must have at most ${max} items`,
});

export const minItems = (min: number): ValidationRule<unknown[]> => ({
    validate: (value: unknown[]) => value.length >= min,
    message: `Must have at least ${min} items`,
});

// Ethereum-specific validation rules
export const ethereumAddress: ValidationRule<string> = {
    validate: (value: string) => /^0x[a-fA-F0-9]{40}$/.test(value),
    message: "Must be a valid Ethereum address",
};

export const tokenId: ValidationRule<string> = {
    validate: (value: string) => /^[0-9]+$/.test(value),
    message: "Must be a valid token ID",
};
