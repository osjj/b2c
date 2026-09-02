export function serializeQuotationData<T>(value: T): unknown {
  return JSON.parse(JSON.stringify(value)) as unknown
}
