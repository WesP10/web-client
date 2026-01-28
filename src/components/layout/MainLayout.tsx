import { Link, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useTelemetryStore } from '@/stores/telemetryStore';
import { useHubStore } from '@/stores/hubStore';
import { webSocketService } from '@/services/websocket';
import { Button } from '@/components/ui/button';
import { LayoutDashboard, Layers, Activity, LogOut, Zap, Menu, X, ChevronLeft, ChevronRight } from 'lucide-react';
import loopIcon from '@/assets/loopIcon.png';

interface MainLayoutProps {
  children: React.ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navigation = [
    { name: 'Hub Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'Device Manager', href: '/devices', icon: Layers },
    { name: 'Live Telemetry', href: '/telemetry', icon: Activity },
    { name: 'Arduino Flash', href: '/flash', icon: Zap },
  ];

  const isActive = (path: string) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  // Register web socket telemetry handler
  useEffect(() => {
    const handler = (message: any) => {
      try {
        if (message?.type === 'telemetry_stream') {
          useTelemetryStore.getState().processTelemetry(message as any);
        } else if (message?.type === 'task_status') {
          // Handle task status updates
          const hubStore = useHubStore.getState();
          hubStore.updateTaskStatus({
            task_id: message.task_id,
            status: message.status,
            result: message.result,
            error: message.error,
          });
        } else if (message?.type === 'device_event') {
          // Handle device disconnect events by auto-unsubscribing
          if (message.event === 'disconnected') {
            const hubStore = useHubStore.getState();
            const isSubscribed = hubStore.activeSubscriptions.some(
              (s) => s.hubId === message.hubId && s.portId === message.portId
            );
            if (isSubscribed) {
              console.log(`Device ${message.hubId}:${message.portId} disconnected, removing subscription`);
              webSocketService.unsubscribe(message.hubId, message.portId);
              hubStore.removeSubscription(message.hubId, message.portId);
            }
          }
        }
      } catch (e) {
        // Keep handler robust
        // eslint-disable-next-line no-console
        console.error('Error in WebSocket message handler:', e);
      }
    };

    const unsub = webSocketService.onMessage(handler);
    return () => unsub();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile Header */}
      <header className="lg:hidden sticky top-0 z-50 w-full border-b bg-card">
        <div className="flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <img src={loopIcon} alt="Hub Manager" className="h-8 lg:h-10 w-auto object-contain flex-shrink-0 max-w-none" />
            <span className="text-lg font-semibold text-foreground">Hub Manager</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="lg:hidden text-white hover:text-white"
          >
            {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </Button>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50 bg-black/50" onClick={() => setIsMobileMenuOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 border-r bg-card shadow-lg transition-all duration-300 ${
        isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
      } lg:translate-x-0 ${
        isSidebarCollapsed ? 'w-16 lg:w-16' : 'w-64 lg:w-64'
      }`}>
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="flex h-16 items-center justify-between border-b px-4 bg-background/50">
            {!isSidebarCollapsed && (
              <div className="flex items-center gap-2">
                <img src={loopIcon} alt="Hub Manager" className="h-8 lg:h-10 w-auto object-contain flex-shrink-0 max-w-none" />
                <span className="text-lg font-semibold text-foreground hidden lg:block">Hub Manager</span>
              </div>
            )}
            {isSidebarCollapsed && (
              <div className="flex items-center justify-center w-full overflow-visible">
                <img src={loopIcon} alt="Hub Manager" className="h-8 lg:h-10 w-auto object-contain flex-shrink-0 max-w-none" />
              </div>
            )}
            {/* Desktop collapse button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              className="hidden lg:flex h-8 w-8 text-white hover:text-white"
            >
              {isSidebarCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </Button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 p-2">
            {navigation.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              const isTelemetry = item.href === '/telemetry';
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 ${
                    active
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : isTelemetry
                      ? 'text-cyan-400 hover:bg-accent hover:text-cyan-300 hover:shadow-sm'
                      : 'text-foreground hover:bg-accent hover:text-foreground hover:shadow-sm'
                  } ${
                    isSidebarCollapsed ? 'justify-center' : ''
                  }`}
                  title={isSidebarCollapsed ? item.name : ''}
                >
                  <Icon className="h-5 w-5 flex-shrink-0" />
                  {!isSidebarCollapsed && <span className="truncate">{item.name}</span>}
                </Link>
              );
            })}
          </nav>

          {/* User Info & Logout */}
          <div className="border-t p-2 bg-background/50">
            <div className={`flex items-center ${
              isSidebarCollapsed ? 'flex-col gap-2' : 'justify-between'
            }`}>
              {!isSidebarCollapsed && (
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium flex-shrink-0">
                    {user?.username?.[0]?.toUpperCase() || 'U'}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-sm font-medium text-foreground truncate">{user?.username || 'User'}</span>
                    <span className="text-xs text-muted-foreground">Connected</span>
                  </div>
                </div>
              )}
              {isSidebarCollapsed && (
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium">
                  {user?.username?.[0]?.toUpperCase() || 'U'}
                </div>
              )}
              <Button
                variant="ghost"
                size="icon"
                onClick={logout}
                title="Logout"
                className="hover:bg-destructive/10 hover:text-destructive transition-colors h-8 w-8 text-white"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className={`transition-all duration-300 ${
        isSidebarCollapsed ? 'lg:pl-16' : 'lg:pl-64'
      } pt-16 lg:pt-0`}>
        <main className="min-h-screen p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
