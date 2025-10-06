// Offline queue for P2P sync operations

interface QueuedOperation {
  id: string;
  type: 'bundle-update' | 'flashcard-update' | 'playlist-update' | 'bundle-delete' | 'flashcard-delete' | 'playlist-delete';
  data: any;
  timestamp: number;
  retries: number;
}

const QUEUE_STORAGE_KEY = 'p2p_offline_queue';
const MAX_RETRIES = 3;

export class OfflineQueue {
  private queue: QueuedOperation[] = [];
  
  constructor() {
    this.loadQueue();
  }
  
  private loadQueue() {
    try {
      const stored = localStorage.getItem(QUEUE_STORAGE_KEY);
      if (stored) {
        this.queue = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Failed to load offline queue:', error);
    }
  }
  
  private saveQueue() {
    try {
      localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(this.queue));
    } catch (error) {
      console.error('Failed to save offline queue:', error);
    }
  }
  
  add(type: QueuedOperation['type'], data: any) {
    const operation: QueuedOperation = {
      id: `op_${Date.now()}_${Math.random()}`,
      type,
      data,
      timestamp: Date.now(),
      retries: 0,
    };
    
    this.queue.push(operation);
    this.saveQueue();
    
    console.log(`[OfflineQueue] Added operation: ${type}`, operation.id);
  }
  
  getAll(): QueuedOperation[] {
    return [...this.queue];
  }
  
  remove(id: string) {
    this.queue = this.queue.filter(op => op.id !== id);
    this.saveQueue();
    console.log(`[OfflineQueue] Removed operation:`, id);
  }
  
  incrementRetry(id: string): boolean {
    const op = this.queue.find(o => o.id === id);
    if (!op) return false;
    
    op.retries++;
    
    if (op.retries >= MAX_RETRIES) {
      console.warn(`[OfflineQueue] Max retries reached for operation ${id}, removing`);
      this.remove(id);
      return false;
    }
    
    this.saveQueue();
    return true;
  }
  
  clear() {
    this.queue = [];
    this.saveQueue();
    console.log('[OfflineQueue] Cleared all operations');
  }
  
  get size(): number {
    return this.queue.length;
  }
}
