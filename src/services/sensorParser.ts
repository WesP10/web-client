import sensorMappingsData from '@/config/sensor-mappings.json';
import type {
  SensorMapping,
  ParsedSensorData,
  DecodedTelemetry,
} from '@/types';

const sensorMappings = sensorMappingsData.sensors as SensorMapping[];

/**
 * Decode base64 telemetry data to text
 */
export function decodeTelemetryData(base64Data: string): DecodedTelemetry {
  try {
    // Decode base64 to binary
    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    // Try to decode as UTF-8
    const decoder = new TextDecoder('utf-8', { fatal: false });
    const text = decoder.decode(bytes);

    // Split into lines
    const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0);

    return {
      raw: bytes,
      text,
      lines,
    };
  } catch (error) {
    console.error('Failed to decode telemetry data:', error);
    return {
      raw: new Uint8Array(0),
      text: '',
      lines: [],
    };
  }
}

/**
 * Convert bytes to hex dump format
 */
export function bytesToHexDump(bytes: Uint8Array, bytesPerLine = 16): string {
  let result = '';
  for (let i = 0; i < bytes.length; i += bytesPerLine) {
    // Offset
    const offset = i.toString(16).padStart(8, '0').toUpperCase();
    result += `${offset}  `;

    // Hex values
    const lineBytes = bytes.slice(i, Math.min(i + bytesPerLine, bytes.length));
    const hexPart: string[] = [];
    const asciiPart: string[] = [];

    for (let j = 0; j < bytesPerLine; j++) {
      if (j < lineBytes.length) {
        const byte = lineBytes[j];
        hexPart.push(byte.toString(16).padStart(2, '0').toUpperCase());
        // ASCII representation (printable characters only)
        asciiPart.push(
          byte >= 32 && byte <= 126 ? String.fromCharCode(byte) : '.'
        );
      } else {
        hexPart.push('  ');
        asciiPart.push(' ');
      }

      // Add extra space in the middle
      if (j === 7) {
        hexPart.push(' ');
      }
    }

    result += hexPart.join(' ') + '  |' + asciiPart.join('') + '|\n';
  }
  return result;
}

/**
 * Detect sensor type from a line of data
 */
export function detectSensorType(line: string): SensorMapping | null {
  for (const sensor of sensorMappings) {
    try {
      const regex = new RegExp(sensor.pattern, 'i');
      if (regex.test(line)) {
        return sensor;
      }
    } catch (error) {
      console.error(`Invalid regex pattern for sensor ${sensor.id}:`, error);
    }
  }
  return null;
}

/**
 * Parse a line of sensor data using detected sensor mapping
 */
export function parseSensorLine(
  line: string,
  sensor: SensorMapping
): ParsedSensorData | null {
  try {
    // Handle JSON format
    if (sensor.format === 'json') {
      const jsonData = JSON.parse(line);
      const fields = Object.entries(jsonData)
        .filter(([, value]) => typeof value === 'number')
        .map(([key, value], index) => ({
          name: key,
          value: value as number,
          unit: '',
          color: getDefaultColor(index),
        }));

      if (fields.length === 0) {
        return null;
      }

      return {
        sensorId: sensor.id,
        sensorName: sensor.name,
        timestamp: new Date(),
        fields,
      };
    }

    // Handle regex-based formats (key-value and CSV)
    const regex = new RegExp(sensor.pattern, 'i');
    const match = regex.exec(line);

    if (!match) {
      return null;
    }

    const fields = sensor.fields.map((field) => {
      const capturedValue = match[field.captureGroup];
      const value = parseFloat(capturedValue);

      if (isNaN(value)) {
        return null;
      }

      return {
        name: field.name,
        value,
        unit: field.unit,
        color: field.color,
      };
    });

    // Filter out null fields
    const validFields = fields.filter((f) => f !== null);

    if (validFields.length === 0) {
      return null;
    }

    return {
      sensorId: sensor.id,
      sensorName: sensor.name,
      timestamp: new Date(),
      fields: validFields as ParsedSensorData['fields'],
    };
  } catch (error) {
    console.error('Failed to parse sensor line:', error);
    return null;
  }
}

/**
 * Get default color for dynamically detected JSON fields
 */
function getDefaultColor(index: number): string {
  const colors = [
    '#FF6384',
    '#36A2EB',
    '#FFCE56',
    '#4BC0C0',
    '#9966FF',
    '#FF9F40',
    '#FF6384',
    '#C9CBCF',
  ];
  return colors[index % colors.length];
}

/**
 * Parse telemetry data with automatic sensor detection
 */
export function parseTelemetryData(
  base64Data: string,
  previousSensor?: SensorMapping
): {
  decoded: DecodedTelemetry;
  parsed: ParsedSensorData[];
  detectedSensor?: SensorMapping;
} {
  const decoded = decodeTelemetryData(base64Data);
  const parsed: ParsedSensorData[] = [];
  let detectedSensor = previousSensor;

  for (const line of decoded.lines) {
    // If we don't have a detected sensor yet, try to detect one
    if (!detectedSensor) {
      const detected = detectSensorType(line);
      detectedSensor = detected || undefined;
      if (!detectedSensor) {
        continue; // Skip this line if we can't detect the sensor
      }
    }

    // Parse the line using the detected sensor
    const parsedLine = parseSensorLine(line, detectedSensor);
    if (parsedLine) {
      parsed.push(parsedLine);
    }
  }

  return {
    decoded,
    parsed,
    detectedSensor,
  };
}

/**
 * Get all available sensor mappings
 */
export function getSensorMappings(): SensorMapping[] {
  return sensorMappings;
}

/**
 * Get a specific sensor mapping by ID
 */
export function getSensorById(id: string): SensorMapping | undefined {
  return sensorMappings.find((s) => s.id === id);
}
