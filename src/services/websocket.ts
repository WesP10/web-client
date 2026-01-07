import { getWebSocketUrl } from './api';
import type {
  WebSocketMessage,
  SubscribeMessage,
  UnsubscribeMessage,
  DeviceSubscription,
} from '@/types';

type MessageHandler = (message: WebSocketMessage) => void;

class WebSocketService {
  private ws: WebSocket | null = null;
  private reconnectTimeout: number | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private baseReconnectDelay = 1000; // 1 second
  private messageHandlers: Set<MessageHandler> = new Set();
  private isIntentionallyClosed = false;
  private token: string | null = null;

  // Queue subscriptions requested while the socket is not yet open
  private pendingSubscriptions: DeviceSubscription[] = [];

  /**
   * Connect to the WebSocket server
   */
  connect(token: string): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      console.log('WebSocket already connected');
      return;
    }

    this.token = token;
    this.isIntentionallyClosed = false;

    try {
      const wsUrl = getWebSocketUrl(token);
      console.log('Connecting to WebSocket:', wsUrl);
      
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('WebSocket connected');
        this.reconnectAttempts = 0;

        // Flush any pending subscriptions that were queued while connecting
        if (this.pendingSubscriptions.length > 0) {
          console.log(`Flushing ${this.pendingSubscriptions.length} pending subscription(s)`);
          const message: SubscribeMessage = {
            type: 'subscribe',
            subscriptions: [...this.pendingSubscriptions],
          };
          // Clear before send to avoid re-queue on failure
          this.pendingSubscriptions = [];
          this.send(message);
        }
      };

      this.ws.onmessage = (event: MessageEvent) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          this.handleMessage(message);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      this.ws.onerror = (error: Event) => {
        console.error('WebSocket error:', error);
      };

      this.ws.onclose = (event: CloseEvent) => {
        console.log('WebSocket closed:', event.code, event.reason);
        this.ws = null;

        if (!this.isIntentionallyClosed) {
          this.scheduleReconnect();
        }
      };
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      this.scheduleReconnect();
    }
  }

  /**
   * Disconnect from the WebSocket server
   */
  disconnect(): void {
    this.isIntentionallyClosed = true;
    
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  /**
   * Subscribe to device telemetry
   */
  subscribe(hubId: string, portId: string): void;
  subscribe(subscriptions: DeviceSubscription[]): void;
  subscribe(arg1: string | DeviceSubscription[], arg2?: string): void {
    let subscriptions: DeviceSubscription[] | null = null;

    if (typeof arg1 === 'string' && arg2) {
      subscriptions = [{ hubId: arg1, portId: arg2 }];
    } else if (Array.isArray(arg1)) {
      subscriptions = arg1;
    } else {
      console.error('Invalid subscribe arguments');
      return;
    }

    // If socket isn't ready, queue subscriptions and attempt to connect
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn('WebSocket not connected; queuing subscription and attempting connect');

      // Dedupe queued subscriptions to avoid duplicates from multiple clicks
      for (const sub of subscriptions) {
        const exists = this.pendingSubscriptions.some(
          (s) => s.hubId === sub.hubId && s.portId === sub.portId
        );
        if (!exists) {
          this.pendingSubscriptions.push(sub);
        } else {
          console.log('Subscription already queued:', sub);
        }
      }

      // Try to connect using stored token (fallback to localStorage)
      const token = this.token || localStorage.getItem('auth_token');
      if (token) {
        try {
          this.connect(token);
        } catch (e) {
          console.error('Failed to initiate WebSocket connect while queuing subscription:', e);
        }
      }

      return;
    }

    const message: SubscribeMessage = {
      type: 'subscribe',
      subscriptions,
    };

    this.send(message);
  }

  /**
   * Unsubscribe from device telemetry
   */
  unsubscribe(hubId: string, portId: string): void;
  unsubscribe(subscriptions: DeviceSubscription[]): void;
  unsubscribe(arg1: string | DeviceSubscription[], arg2?: string): void {
    let subscriptions: DeviceSubscription[] | null = null;
    if (typeof arg1 === 'string' && arg2) {
      subscriptions = [{ hubId: arg1, portId: arg2 }];
    } else if (Array.isArray(arg1)) {
      subscriptions = arg1;
    } else {
      console.error('Invalid unsubscribe arguments');
      return;
    }

    // If we have queued subscriptions, remove matching ones from queue
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      this.pendingSubscriptions = this.pendingSubscriptions.filter(
        (s) => !subscriptions!.some((u) => u.hubId === s.hubId && u.portId === s.portId)
      );

      console.warn('WebSocket not connected; removed matching subscriptions from queue');
      return;
    }

    const message: UnsubscribeMessage = {
      type: 'unsubscribe',
      subscriptions,
    };

    this.send(message);
  }

  /**
   * Register a message handler
   */
  onMessage(handler: MessageHandler): () => void {
    this.messageHandlers.add(handler);
    
    // Return unsubscribe function
    return () => {
      this.messageHandlers.delete(handler);
    };
  }

  /**
   * Send a message to the WebSocket server
   */
  private send(message: any): void {
    console.log('Sending WebSocket message:', message);
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.error('WebSocket not connected, cannot send message');
    }
  }

  /**
   * Handle incoming WebSocket messages
   */
  private handleMessage(message: WebSocketMessage): void {
    console.log('Received WebSocket message:', message);
    this.messageHandlers.forEach((handler) => {
      try {
        handler(message);
      } catch (error) {
        console.error('Error in message handler:', error);
      }
    });
  }

  /**
   * Schedule a reconnection attempt with exponential backoff
   */
  private scheduleReconnect(): void {
    if (this.isIntentionallyClosed) {
      return;
    }

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      return;
    }

    // Exponential backoff: 1s, 2s, 4s, 8s, 16s, 32s, 64s...
    const delay = Math.min(
      this.baseReconnectDelay * Math.pow(2, this.reconnectAttempts),
      30000 // Max 30 seconds
    );

    console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts + 1}/${this.maxReconnectAttempts})`);

    this.reconnectAttempts++;
    this.reconnectTimeout = window.setTimeout(() => {
      if (this.token) {
        this.connect(this.token);
      }
    }, delay);
  }

  /**
   * Get connection status
   */
  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  hasPendingSubscription(hubId: string, portId: string): boolean {
    return this.pendingSubscriptions.some((s) => s.hubId === hubId && s.portId === portId);
  }

  getPendingSubscriptions(): DeviceSubscription[] {
    return [...this.pendingSubscriptions];
  }
}

// Export singleton instance
export const webSocketService = new WebSocketService();
