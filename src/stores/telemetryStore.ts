import { create } from 'zustand';
import { throttle } from 'lodash';
import type {
  TelemetryMessage,
  DeviceChartData,
  FieldChartData,
  ChartDataPoint,
  TimeWindow,
  SensorMapping,
  ParsedSensorData,
} from '@/types';
import { parseTelemetryData } from '@/services/sensorParser';

const ONE_HOUR_MS = 60 * 60 * 1000;

interface DeviceTelemetryState {
  rawData: string; // Terminal text buffer
  hexData: string; // Hex dump
  sensorMapping?: SensorMapping;
  chartData: DeviceChartData;
  lastUpdate: number;
}

interface TelemetryState {
  // Map of deviceKey (hubId:portId) to telemetry state
  devices: Map<string, DeviceTelemetryState>;
  
  // Map of deviceKey to detected sensor type
  detectedSensors: Map<string, string>;
  
  // Render throttle control
  shouldUpdate: boolean;
  
  // Actions
  processTelemetry: (message: TelemetryMessage) => void;
  clearDevice: (hubId: string, portId: string) => void;
  getDeviceData: (hubId: string, portId: string) => DeviceTelemetryState | undefined;
  getChartData: (hubId: string, portId: string, timeWindow: TimeWindow) => FieldChartData[];
  triggerUpdate: () => void;
}

function deviceKey(hubId: string, portId: string): string {
  return `${hubId}:${portId}`;
}

function getTimeWindowMilliseconds(window: TimeWindow): number {
  const windows = {
    '5m': 5 * 60 * 1000,
    '15m': 15 * 60 * 1000,
    '30m': 30 * 60 * 1000,
    '1h': 60 * 60 * 1000,
  };
  return windows[window];
}

function pruneOldDataPoints(
  data: ChartDataPoint[],
  maxAge: number = ONE_HOUR_MS
): ChartDataPoint[] {
  const now = Date.now();
  return data.filter((point) => now - point.timestamp < maxAge);
}

export const useTelemetryStore = create<TelemetryState>((set, get) => ({
  devices: new Map(),
  detectedSensors: new Map(),
  shouldUpdate: true,

  processTelemetry: (message: TelemetryMessage) => {
    const key = deviceKey(message.hubId, message.portId);
    const state = get();
    const existing = state.devices.get(key);

    // Parse the telemetry data
    const { decoded, parsed, detectedSensor } = parseTelemetryData(
      message.data,
      existing?.sensorMapping
    );

    // Update detected sensor type
    if (detectedSensor) {
      set((state) => {
        const newDetectedSensors = new Map(state.detectedSensors);
        newDetectedSensors.set(key, detectedSensor.name);
        return { detectedSensors: newDetectedSensors };
      });
    }

    // Build terminal text
    const terminalText = decoded.lines
      .map((line) => `[${new Date(message.timestamp).toLocaleTimeString()}] ${line}`)
      .join('\n');

    // Build hex dump
    const hexDump = decoded.raw.length > 0 
      ? bytesToHexDump(decoded.raw)
      : '';

    // Initialize device state if it doesn't exist
    let deviceState: DeviceTelemetryState;
    
    if (!existing) {
      deviceState = {
        rawData: terminalText,
        hexData: hexDump,
        sensorMapping: detectedSensor,
        chartData: {
          deviceId: key,
          hubId: message.hubId,
          portId: message.portId,
          sensorName: detectedSensor?.name || 'Unknown',
          fields: [],
        },
        lastUpdate: Date.now(),
      };
    } else {
      // Append to existing data
      deviceState = {
        ...existing,
        rawData: existing.rawData + '\n' + terminalText,
        hexData: existing.hexData + hexDump,
        sensorMapping: detectedSensor || existing.sensorMapping,
        lastUpdate: Date.now(),
      };

      // Keep terminal buffer manageable (last 1000 lines)
      const lines = deviceState.rawData.split('\n');
      if (lines.length > 1000) {
        deviceState.rawData = lines.slice(-1000).join('\n');
      }
    }

    // Update chart data with parsed sensor values
    if (parsed.length > 0 && deviceState.sensorMapping) {
      const timestamp = new Date(message.timestamp).getTime();

      parsed.forEach((parsedData: ParsedSensorData) => {
        parsedData.fields.forEach((field) => {
          // Find or create field in chart data
          let fieldData = deviceState.chartData.fields.find(
            (f) => f.fieldName === field.name
          );

          if (!fieldData) {
            fieldData = {
              fieldName: field.name,
              unit: field.unit,
              color: field.color,
              data: [],
            };
            deviceState.chartData.fields.push(fieldData);
          }

          // Add new data point
          fieldData.data.push({
            timestamp,
            value: field.value,
          });

          // Prune old data (keep 1 hour)
          fieldData.data = pruneOldDataPoints(fieldData.data, ONE_HOUR_MS);
        });
      });

      // Update sensor name if detected
      if (deviceState.sensorMapping) {
        deviceState.chartData.sensorName = deviceState.sensorMapping.name;
      }
    }

    // Update the store
    const newDevices = new Map(state.devices);
    newDevices.set(key, deviceState);
    
    set({ devices: newDevices });
  },

  clearDevice: (hubId: string, portId: string) => {
    const key = deviceKey(hubId, portId);
    const newDevices = new Map(get().devices);
    newDevices.delete(key);
    set({ devices: newDevices });
  },

  getDeviceData: (hubId: string, portId: string) => {
    const key = deviceKey(hubId, portId);
    return get().devices.get(key);
  },

  getChartData: (hubId: string, portId: string, timeWindow: TimeWindow) => {
    const key = deviceKey(hubId, portId);
    const deviceData = get().devices.get(key);
    
    if (!deviceData || !deviceData.chartData.fields.length) {
      return [];
    }

    const windowMs = getTimeWindowMilliseconds(timeWindow);
    const now = Date.now();

    // Filter data points by time window
    return deviceData.chartData.fields.map((field) => ({
      ...field,
      data: field.data.filter((point) => now - point.timestamp < windowMs),
    }));
  },

  triggerUpdate: () => {
    set({ shouldUpdate: true });
  },
}));

// Helper function to convert bytes to hex dump (imported from sensorParser)
function bytesToHexDump(bytes: Uint8Array, bytesPerLine = 16): string {
  let result = '';
  for (let i = 0; i < bytes.length; i += bytesPerLine) {
    const offset = i.toString(16).padStart(8, '0').toUpperCase();
    result += `${offset}  `;

    const lineBytes = bytes.slice(i, Math.min(i + bytesPerLine, bytes.length));
    const hexPart: string[] = [];
    const asciiPart: string[] = [];

    for (let j = 0; j < bytesPerLine; j++) {
      if (j < lineBytes.length) {
        const byte = lineBytes[j];
        hexPart.push(byte.toString(16).padStart(2, '0').toUpperCase());
        asciiPart.push(
          byte >= 32 && byte <= 126 ? String.fromCharCode(byte) : '.'
        );
      } else {
        hexPart.push('  ');
        asciiPart.push(' ');
      }

      if (j === 7) {
        hexPart.push(' ');
      }
    }

    result += hexPart.join(' ') + '  |' + asciiPart.join('') + '|\n';
  }
  return result;
}

// Throttled update trigger (250ms)
export const throttledTriggerUpdate = throttle(() => {
  useTelemetryStore.getState().triggerUpdate();
}, 250);
