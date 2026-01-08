import type { SensorMapping, SensorField } from '@/types';

const CUSTOM_SCHEMAS_KEY = 'customChartSchemas';

export function generateArduinoPrintStatement(
  format: string,
  pattern: string,
  fields: SensorField[]
): string {
  if (!pattern || fields.length === 0) {
    return 'Serial.println("...");';
  }

  if (format === 'key-value') {
    const statements = fields.map((field, index) => {
      const isLast = index === fields.length - 1;
      const printMethod = isLast ? 'println' : 'print';
      const key = field.name.toLowerCase().replace(/\s+/g, '_');
      return `Serial.print("${key}="); Serial.${printMethod}(${key});`;
    });
    return statements.join(' ');
  }

  if (format === 'csv') {
    const variables = fields.map(f => f.name.toLowerCase().replace(/\s+/g, '_')).join(' + "," + ');
    return `Serial.println(${variables});`;
  }

  if (format === 'json') {
    const jsonKeys = fields
      .map(f => `\\"${f.name.toLowerCase().replace(/\s+/g, '_')}\\": \\" + ${f.name.toLowerCase().replace(/\s+/g, '_')} + \\"`)
      .join(', ');
    return `Serial.println("{ ${jsonKeys} }");`;
  }

  return 'Serial.println("...");';
}

export function generateRegexPattern(format: string, fields: SensorField[]): string {
  if (fields.length === 0) {
    return '';
  }

  if (format === 'key-value') {
    const patterns = fields.map(field => {
      const fieldKey = field.name.toLowerCase().replace(/\s+/g, '_');
      return `${fieldKey}[=:]\\s*([\\d.]+)`;
    });
    return patterns.join('\\s+');
  }

  if (format === 'csv') {
    const captureGroups = fields.map(() => '([\\d.]+)');
    return captureGroups.join(',\\s*');
  }

  if (format === 'json') {
    const patterns = fields.map(field => {
      const fieldKey = field.name.toLowerCase().replace(/\s+/g, '_');
      return `"${fieldKey}":\\s*([\\d.]+)`;
    });
    return patterns.join(',?\\s*');
  }

  return '';
}

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
