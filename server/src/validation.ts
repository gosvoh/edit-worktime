export function parsePositiveNumber(
  raw: unknown,
  field: string,
  options: { allowZero?: boolean; min?: number; max?: number } = {}
) {
  const value = Number(raw);
  if (!Number.isFinite(value)) {
    throw new Error(`Поле "${field}" должно быть числом.`);
  }
  if (!options.allowZero && value <= 0) {
    throw new Error(`Поле "${field}" должно быть больше 0.`);
  }
  if (options.allowZero && value < 0) {
    throw new Error(`Поле "${field}" не может быть отрицательным.`);
  }
  if (typeof options.min === "number" && value < options.min) {
    throw new Error(`Поле "${field}" должно быть не меньше ${options.min}.`);
  }
  if (typeof options.max === "number" && value > options.max) {
    throw new Error(`Поле "${field}" должно быть не больше ${options.max}.`);
  }
  return value;
}

export function parseString(raw: unknown, field: string, minLength = 1, maxLength = 150) {
  if (typeof raw !== "string") {
    throw new Error(`Поле "${field}" должно быть строкой.`);
  }
  const value = raw.trim();
  if (value.length < minLength) {
    throw new Error(`Поле "${field}" слишком короткое.`);
  }
  if (value.length > maxLength) {
    throw new Error(`Поле "${field}" слишком длинное.`);
  }
  return value;
}
