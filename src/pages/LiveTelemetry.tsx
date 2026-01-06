import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Construction, Terminal as TerminalIcon, FileCode, LineChart } from 'lucide-react';
import type { TimeWindow } from '@/types';

export function LiveTelemetry() {
  const [timeWindow, setTimeWindow] = useState<TimeWindow>('1h');

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
                Serial Terminal - Coming Soon
              </CardTitle>
              <CardDescription>
                Arduino IDE-style serial monitor
              </CardDescription>
            </CardHeader>
            <CardContent className="py-12">
              <div className="text-center text-muted-foreground">
                <p>Terminal features:</p>
                <ul className="mt-4 space-y-2">
                  <li>• Monospace font with dark theme</li>
                  <li>• Auto-scroll to latest data</li>
                  <li>• Timestamps per line</li>
                  <li>• Clear buffer button</li>
                  <li>• UTF-8 decoded text display</li>
                </ul>
              </div>
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
