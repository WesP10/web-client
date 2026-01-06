import { useEffect, useState } from 'react';
import { useHubStore } from '@/stores/hubStore';
import { useTelemetryStore } from '@/stores/telemetryStore';
import { hubsApi } from '@/services/api';
import { webSocketService } from '@/services/websocket';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Layers, Radio, CheckSquare, XSquare, Wifi, WifiOff, AlertCircle } from 'lucide-react';
import type { PortInfo, ConnectionInfo } from '@/types';

interface HubWithDevices {
  hubId: string;
  connected: boolean;
  ports: PortInfo[];
  connections: ConnectionInfo[];
  isExpanded: boolean;
}

export function DeviceManager() {
  const { hubs, activeSubscriptions, addSubscription, removeSubscription, selectedDevices, toggleDeviceSelection, clearDeviceSelection } = useHubStore();
  const { detectedSensors } = useTelemetryStore();
  const [hubsWithDevices, setHubsWithDevices] = useState<HubWithDevices[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [expandedHubs, setExpandedHubs] = useState<Set<string>>(new Set());

  // Fetch hub ports and connections
  const fetchDevices = async () => {
    setIsLoading(true);
    try {
      const hubsData = await Promise.all(
        hubs.map(async (hub) => {
          try {
            const [ports, connections] = await Promise.all([
              hubsApi.getPorts(hub.hubId),
              hubsApi.getConnections(hub.hubId),
            ]);
            return {
              hubId: hub.hubId,
              connected: hub.connected,
              ports,
              connections,
              isExpanded: expandedHubs.has(hub.hubId),
            };
          } catch (error) {
            console.error(`Failed to fetch devices for hub ${hub.hubId}:`, error);
            return {
              hubId: hub.hubId,
              connected: hub.connected,
              ports: [],
              connections: [],
              isExpanded: expandedHubs.has(hub.hubId),
            };
          }
        })
      );
      setHubsWithDevices(hubsData);
    } catch (error) {
      console.error('Failed to fetch devices:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (hubs.length > 0) {
      fetchDevices();
    }
  }, [hubs]);

  const toggleHubExpansion = (hubId: string) => {
    setExpandedHubs((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(hubId)) {
        newSet.delete(hubId);
      } else {
        newSet.add(hubId);
      }
      return newSet;
    });
  };

  const isDeviceSelected = (hubId: string, portId: string): boolean => {
    return selectedDevices.has(`${hubId}:${portId}`);
  };

  const getConnectionStatus = (hubId: string, portId: string): ConnectionInfo | undefined => {
    const hub = hubsWithDevices.find((h) => h.hubId === hubId);
    return hub?.connections.find((c) => c.port_id === portId);
  };

  const getSensorType = (hubId: string, portId: string): string | undefined => {
    return detectedSensors.get(`${hubId}:${portId}`);
  };

  const isSubscribed = (hubId: string, portId: string): boolean => {
    return activeSubscriptions.some((s) => s.hubId === hubId && s.portId === portId);
  };

  const handleSubscribeSelected = async () => {
    const devices = Array.from(selectedDevices).map((key) => {
      const [hubId, portId] = key.split(':');
      return { hubId, portId };
    });

    for (const { hubId, portId } of devices) {
      if (!isSubscribed(hubId, portId)) {
        webSocketService.subscribe(hubId, portId);
        addSubscription({
          hubId,
          portId,
          subscribedAt: new Date().toISOString(),
        });
      }
    }

    clearDeviceSelection();
  };

  const handleUnsubscribe = (hubId: string, portId: string) => {
    webSocketService.unsubscribe(hubId, portId);
    removeSubscription(hubId, portId);
  };

  const selectedCount = selectedDevices.size;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-cyan-400">Device Manager</h1>
        <p className="text-muted-foreground">
          Manage device connections and telemetry subscriptions
        </p>
      </div>

      {/* Action Bar */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <CheckSquare className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm font-medium">
                  {selectedCount} device{selectedCount !== 1 ? 's' : ''} selected
                </span>
              </div>
              {selectedCount > 0 && (
                <>
                  <Button onClick={handleSubscribeSelected} size="sm">
                    <Radio className="mr-2 h-4 w-4" />
                    Subscribe to Selected
                  </Button>
                  <Button onClick={clearDeviceSelection} variant="outline" size="sm">
                    <XSquare className="mr-2 h-4 w-4" />
                    Clear Selection
                  </Button>
                </>
              )}
            </div>
            <Button onClick={fetchDevices} variant="outline" size="sm" disabled={isLoading}>
              {isLoading ? 'Refreshing...' : 'Refresh'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Hub Tree */}
      <div className="grid gap-4">
        {hubsWithDevices.map((hub) => (
          <Card key={hub.hubId}>
            <CardHeader
              className="cursor-pointer hover:bg-accent/50 transition-colors"
              onClick={() => toggleHubExpansion(hub.hubId)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Layers className="h-5 w-5" />
                  <div>
                    <CardTitle className="text-lg">{hub.hubId}</CardTitle>
                    <CardDescription>
                      {hub.ports.length} port{hub.ports.length !== 1 ? 's' : ''} •{' '}
                      {hub.connections.length} active connection{hub.connections.length !== 1 ? 's' : ''}
                    </CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {hub.connected ? (
                    <Badge variant="default" className="bg-green-500">
                      <Wifi className="mr-1 h-3 w-3" />
                      Connected
                    </Badge>
                  ) : (
                    <Badge variant="destructive">
                      <WifiOff className="mr-1 h-3 w-3" />
                      Disconnected
                    </Badge>
                  )}
                </div>
              </div>
            </CardHeader>

            {expandedHubs.has(hub.hubId) && (
              <CardContent className="space-y-2">
                {hub.ports.length === 0 ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
                    <AlertCircle className="h-4 w-4" />
                    <span>No devices detected on this hub</span>
                  </div>
                ) : (
                  hub.ports.map((port) => {
                    const connection = getConnectionStatus(hub.hubId, port.port_id);
                    const sensorType = getSensorType(hub.hubId, port.port_id);
                    const subscribed = isSubscribed(hub.hubId, port.port_id);
                    const selected = isDeviceSelected(hub.hubId, port.port_id);

                    return (
                      <div
                        key={port.port_id}
                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/30 transition-colors"
                      >
                        <div className="flex items-center gap-3 flex-1">
                          <Checkbox
                            checked={selected}
                            onCheckedChange={() => toggleDeviceSelection(hub.hubId, port.port_id)}
                            disabled={subscribed}
                          />
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm">{port.port}</span>
                              {connection && (
                                <Badge variant="outline" className="text-xs">
                                  {connection.baud_rate} baud
                                </Badge>
                              )}
                              {sensorType && (
                                <Badge variant="secondary" className="text-xs">
                                  {sensorType}
                                </Badge>
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                              {port.description || port.manufacturer || 'Unknown device'}
                              {port.serial_number && ` • SN: ${port.serial_number}`}
                            </div>
                            {connection && (
                              <div className="text-xs text-muted-foreground mt-1">
                                Session: {connection.session_id.slice(0, 8)}... • ↓ {connection.bytes_read} bytes • ↑ {connection.bytes_written} bytes
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {subscribed ? (
                            <>
                              <Badge className="bg-blue-500">
                                <Radio className="mr-1 h-3 w-3" />
                                Subscribed
                              </Badge>
                              <Button
                                onClick={() => handleUnsubscribe(hub.hubId, port.port_id)}
                                variant="outline"
                                size="sm"
                              >
                                Unsubscribe
                              </Button>
                            </>
                          ) : (
                            <Button
                              onClick={() => {
                                webSocketService.subscribe(hub.hubId, port.port_id);
                                addSubscription({
                                  hubId: hub.hubId,
                                  portId: port.port_id,
                                  subscribedAt: new Date().toISOString(),
                                });
                              }}
                              variant="default"
                              size="sm"
                            >
                              <Radio className="mr-2 h-4 w-4" />
                              Subscribe
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </CardContent>
            )}
          </Card>
        ))}
      </div>

      {/* Active Subscriptions */}
      {activeSubscriptions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Active Subscriptions</CardTitle>
            <CardDescription>
              {activeSubscriptions.length} active telemetry stream{activeSubscriptions.length !== 1 ? 's' : ''}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {activeSubscriptions.map((sub) => {
                const sensorType = getSensorType(sub.hubId, sub.portId);
                return (
                  <div
                    key={`${sub.hubId}:${sub.portId}`}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <Radio className="h-4 w-4 text-blue-500" />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">
                            {sub.hubId} → {sub.portId}
                          </span>
                          {sensorType && (
                            <Badge variant="secondary" className="text-xs">
                              {sensorType}
                            </Badge>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Subscribed at {new Date(sub.subscribedAt).toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                    <Button
                      onClick={() => handleUnsubscribe(sub.hubId, sub.portId)}
                      variant="ghost"
                      size="sm"
                    >
                      Unsubscribe
                    </Button>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {hubsWithDevices.length === 0 && !isLoading && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Layers className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Hubs Connected</h3>
            <p className="text-sm text-muted-foreground text-center max-w-md">
              Connect a Raspberry Pi hub to start managing devices and viewing telemetry data.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
