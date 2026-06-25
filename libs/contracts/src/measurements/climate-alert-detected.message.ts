import { AlertType } from './alert-type';

export interface ClimateAlertDetectedMessage {
  messageId: string;
  occurredAt: string;
  measurementId: string;
  stationId: string;
  stationName: string;
  alertType: AlertType;
  reportedAt: string;
  temperature: number;
  humidity: number;
  pressure: number;
  correlationId?: string;
}

export interface ClimateAlertDetectedMessageValidationResult {
  valid: boolean;
  errors: string[];
  message?: ClimateAlertDetectedMessage;
}

const stringFields = [
  'messageId',
  'occurredAt',
  'measurementId',
  'stationId',
  'stationName',
  'reportedAt',
] as const;

const numberFields = ['temperature', 'humidity', 'pressure'] as const;

export function validateClimateAlertDetectedMessage(
  candidate: unknown,
): ClimateAlertDetectedMessageValidationResult {
  const errors: string[] = [];

  if (!isRecord(candidate)) {
    return {
      valid: false,
      errors: ['message must be a JSON object'],
    };
  }

  for (const field of stringFields) {
    if (!isNonEmptyString(candidate[field])) {
      errors.push(`${field} must be a non-empty string`);
    }
  }

  for (const field of numberFields) {
    if (!isFiniteNumber(candidate[field])) {
      errors.push(`${field} must be a finite number`);
    }
  }

  if (!isSupportedAlertType(candidate.alertType)) {
    errors.push('alertType must be a supported climate alert type');
  }

  if (
    isNonEmptyString(candidate.occurredAt) &&
    !isValidIsoDate(candidate.occurredAt)
  ) {
    errors.push('occurredAt must be a valid ISO date string');
  }

  if (
    isNonEmptyString(candidate.reportedAt) &&
    !isValidIsoDate(candidate.reportedAt)
  ) {
    errors.push('reportedAt must be a valid ISO date string');
  }

  if (
    candidate.correlationId !== undefined &&
    !isNonEmptyString(candidate.correlationId)
  ) {
    errors.push('correlationId must be a non-empty string when provided');
  }

  if (errors.length > 0) {
    return {
      valid: false,
      errors,
    };
  }

  return {
    valid: true,
    errors: [],
    message: candidate as unknown as ClimateAlertDetectedMessage,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isValidIsoDate(value: string): boolean {
  return !Number.isNaN(Date.parse(value));
}

function isSupportedAlertType(value: unknown): value is AlertType {
  return (
    typeof value === 'string' &&
    value !== AlertType.NONE &&
    Object.values(AlertType).includes(value as AlertType)
  );
}
