import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { CommandButton } from '@/components/ui/CommandButton';
import { Badge } from '@/components/ui/badge';
import { Construction, Terminal as TerminalIcon, FileCode, LineChart, Send } from 'lucide-react';
import { commandService } from '@/services/commandService';
import type { TimeWindow } from '@/types';
import { useHubStore } from '@/stores/hubStore';
import { useTelemetryStore } from '@/stores/telemetryStore';

export function LiveTelemetry() {
  const [timeWindow, setTimeWindow] = useState<TimeWindow>('1h');
  const [serialInputs, setSerialInputs] = useState<Map<string, string>>(new Map());

  const { activeSubscriptions } = useHubStore();
  const { devices: telemetryDevices } = useTelemetryStore();

  const handleSerialInput = (key: string, value: string) => {
    setSerialInputs(new Map(serialInputs).set(key, value));
  };

  const handleSendSerial = async (hubId: string, portId: string, key: string) => {
    const data = serialInputs.get(key) || '';
    if (!data.trim()) return;

    await commandService.serialWrite(hubId, portId, data);
    
    // Clear input after sending
    setSerialInputs(new Map(serialInputs).set(key, ''));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-cyan-400">Live Telemetry</h1>
          <p className="text-muted-foreground">
            Real-time sensor data from subscribed devices
          </p>
        </div>
        <Select value={timeWindow} onValueChange={(v) => setTimeWindow(v as TimeWindow)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Time Window" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="5m">Last 5 Minutes</SelectItem>
            <SelectItem value="15m">Last 15 Minutes</SelectItem>
            <SelectItem value="30m">Last 30 Minutes</SelectItem>
            <SelectItem value="1h">Last 1 Hour</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Tabs defaultValue="charts" className="space-y-4">
        <TabsList>
          <TabsTrigger value="charts" className="gap-2">
            <LineChart className="h-4 w-4" />
            Charts
          </TabsTrigger>
          <TabsTrigger value="terminal" className="gap-2">
            <TerminalIcon className="h-4 w-4" />
            Terminal
          </TabsTrigger>
          <TabsTrigger value="hex" className="gap-2">
            <FileCode className="h-4 w-4" />
            Raw Hex
          </TabsTrigger>
        </TabsList>

        <TabsContent value="charts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Construction className="h-5 w-5" />
                Sensor Charts - Coming Soon
              </CardTitle>
              <CardDescription>
                Real-time line charts for numeric sensor data
              </CardDescription>
            </CardHeader>
            <CardContent className="py-12">
              <div className="text-center text-muted-foreground">
                <p>Chart features:</p>
                <ul className="mt-4 space-y-2">
                  <li>• Multi-line charts per sensor field</li>
                  <li>• Automatic sensor type detection</li>
                  <li>• 1-hour data retention with circular buffer</li>
                  <li>• Color-coded lines with units</li>
                  <li>• Throttled updates (250ms) for smooth rendering</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="terminal" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Construction className="h-5 w-5" />
                Serial Terminal - Live
              </CardTitle>
              <CardDescription>
                Recent telemetry from your subscribed devices
              </CardDescription>
            </CardHeader>
            <CardContent>
              {activeSubscriptions.length === 0 ? (
                <div className="text-sm text-muted-foreground py-6">No active subscriptions. Subscribe to devices in Device Manager.</div>
              ) : (
                <div className="space-y-4">
                  {activeSubscriptions.map((sub) => {
                    const key = `${sub.hubId}:${sub.portId}`;
                    const device = telemetryDevices.get(key);
                    const lastLines = device?.rawData ? device.rawData.split('\n').slice(-5).join('\n') : 'No data yet';
                    const inputValue = serialInputs.get(key) || '';
                    
                    return (
                      <Card key={key} className="p-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="font-medium">{sub.hubId} → {sub.portId}</div>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs text-muted-foreground">Subscribed at {new Date(sub.subscribedAt).toLocaleTimeString()}</span>
                              {sub.sensorType && (
                                <Badge variant="outline" className="text-xs">
                                  {sub.sensorName || sub.sensorType}
                                </Badge>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <CommandButton
                              hubId={sub.hubId}
                              portId={sub.portId}
                              commandType="restart"
                              variant="outline"
                              size="sm"
                            />
                          </div>
                        </div>
                        <pre className="mt-3 bg-black text-white p-3 rounded text-xs whitespace-pre-wrap">{lastLines}</pre>
                        
                        {/* Serial Write Input */}
                        <div className="mt-3 flex items-center gap-2">
                          <Input
                            type="text"
                            placeholder="Type data to send..."
                            value={inputValue}
                            onChange={(e) => handleSerialInput(key, e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSendSerial(sub.hubId, sub.portId, key);
                              }
                            }}
                            className="flex-1 text-sm"
                          />
                          <Button
                            onClick={() => handleSendSerial(sub.hubId, sub.portId, key)}
                            size="sm"
                            disabled={!inputValue.trim()}
                          >
                            <Send className="h-4 w-4" />
                          </Button>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="hex" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Construction className="h-5 w-5" />
                Hex Dump - Coming Soon
              </CardTitle>
              <CardDescription>
                Raw binary data in hex format
              </CardDescription>
            </CardHeader>
            <CardContent className="py-12">
              <div className="text-center text-muted-foreground">
                <p>Hex dump features:</p>
                <ul className="mt-4 space-y-2">
                  <li>• 16 bytes per line</li>
                  <li>• Byte offset column</li>
                  <li>• ASCII preview column</li>
                  <li>• Data size statistics</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
