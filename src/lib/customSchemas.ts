import type { SensorMapping } from '@/types';

const CUSTOM_SCHEMAS_KEY = 'customChartSchemas';

export function getCustomSchemas(): SensorMapping[] {
  try {
    const stored = localStorage.getItem(CUSTOM_SCHEMAS_KEY);
    if (!stored) return [];
    return JSON.parse(stored);
  } catch (error) {
    console.error('Error loading custom schemas:', error);
    return [];
  }
}

export function saveCustomSchema(schema: SensorMapping): void {
  try {
    const existing = getCustomSchemas();
    const updated = [...existing, schema];
    localStorage.setItem(CUSTOM_SCHEMAS_KEY, JSON.stringify(updated));
  } catch (error) {
    console.error('Error saving custom schema:', error);
  }
}

export function deleteCustomSchema(schemaId: string): void {
  try {
    const existing = getCustomSchemas();
    const updated = existing.filter(s => s.id !== schemaId);
    localStorage.setItem(CUSTOM_SCHEMAS_KEY, JSON.stringify(updated));
  } catch (error) {
    console.error('Error deleting custom schema:', error);
  }
}

export function getAllSchemas(builtInSchemas: SensorMapping[]): SensorMapping[] {
  const custom = getCustomSchemas();
  return [...builtInSchemas, ...custom];
}
