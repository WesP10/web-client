import { useEffect, useState } from 'react';
import { useHubStore } from '@/stores/hubStore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Search, Server, Wifi, WifiOff } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export function Dashboard() {
  const { hubs, fetchHubs, isLoading } = useHubStore();
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchHubs();
    // Refresh every 30 seconds
    const interval = setInterval(fetchHubs, 30000);
    return () => clearInterval(interval);
  }, [fetchHubs]);

  const filteredHubs = hubs.filter((hub) =>
    hub.hubId.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-cyan-400">Hub Dashboard</h1>
        <p className="text-muted-foreground">
          Monitor and manage your RPi hub connections
        </p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search hubs..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9 text-foreground"
        />
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Hubs</CardTitle>
            <Server className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{hubs.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Connected</CardTitle>
            <Wifi className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {hubs.filter((h) => h.connected).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Disconnected</CardTitle>
            <WifiOff className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {hubs.filter((h) => !h.connected).length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Hub List */}
      <div className="space-y-4">
        {isLoading ? (
          <Card>
            <CardContent className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                <p className="text-sm text-muted-foreground">Loading hubs...</p>
              </div>
            </CardContent>
          </Card>
        ) : filteredHubs.length === 0 ? (
          <Card>
            <CardContent className="flex items-center justify-center py-12">
              <div className="text-center">
                <Server className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  {searchQuery ? 'No hubs found' : 'No hubs connected'}
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          filteredHubs.map((hub) => (
            <Card key={hub.hubId}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="flex items-center gap-2">
                      <Server className="h-5 w-5" />
                      {hub.hubId}
                    </CardTitle>
                    <CardDescription>
                      Version: {hub.version || 'Unknown'}
                    </CardDescription>
                  </div>
                  <Badge variant={hub.connected ? 'success' : 'destructive'}>
                    {hub.connected ? (
                      <>
                        <Wifi className="h-3 w-3 mr-1" />
                        Connected
                      </>
                    ) : (
                      <>
                        <WifiOff className="h-3 w-3 mr-1" />
                        Disconnected
                      </>
                    )}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-2 text-sm">
                  {hub.connected && hub.connectedAt && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Connected:</span>
                      <span>
                        {formatDistanceToNow(new Date(hub.connectedAt), {
                          addSuffix: true,
                        })}
                      </span>
                    </div>
                  )}
                  {hub.lastSeen && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Last Seen:</span>
                      <span>
                        {formatDistanceToNow(new Date(hub.lastSeen), {
                          addSuffix: true,
                        })}
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
