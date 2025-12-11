/**
 * Infinite Scroll with Deferred Loading - React 19
 * React Paris Meetup #011
 *
 * Demonstrates:
 * - useDeferredValue for smooth scrolling during data processing
 * - useTransition for non-blocking data fetches
 * - Suspense for loading states
 * - Virtualization for performance with large lists
 */

import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useDeferredValue,
  useTransition,
  useMemo,
  Suspense,
} from 'react';

// =============================================================================
// TYPES
// =============================================================================

interface Item {
  id: number;
  title: string;
  description: string;
  imageUrl: string;
  category: string;
  timestamp: number;
}

interface VirtualizedListProps {
  items: Item[];
  itemHeight: number;
  containerHeight: number;
  overscan?: number;
}

// =============================================================================
// MOCK DATA & API
// =============================================================================

function generateItems(startId: number, count: number): Item[] {
  const categories = ['Technology', 'Science', 'Art', 'Music', 'Sports'];
  return Array.from({ length: count }, (_, i) => ({
    id: startId + i,
    title: `Item ${startId + i}`,
    description: `This is a detailed description for item ${startId + i}. It contains enough text to simulate real content that might appear in a feed or list.`,
    imageUrl: `https://picsum.photos/seed/${startId + i}/100/100`,
    category: categories[(startId + i) % categories.length],
    timestamp: Date.now() - (startId + i) * 60000,
  }));
}

// Simulate API delay
async function fetchItems(page: number, pageSize: number): Promise<Item[]> {
  await new Promise((resolve) => setTimeout(resolve, 500 + Math.random() * 500));
  return generateItems(page * pageSize, pageSize);
}

// =============================================================================
// VIRTUALIZED LIST COMPONENT
// =============================================================================

function VirtualizedList({
  items,
  itemHeight,
  containerHeight,
  overscan = 3,
}: VirtualizedListProps) {
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Defer scroll position updates to keep scrolling smooth
  const deferredScrollTop = useDeferredValue(scrollTop);
  const isScrolling = scrollTop !== deferredScrollTop;

  // Calculate visible range
  const { startIndex, endIndex, offsetY } = useMemo(() => {
    const start = Math.max(0, Math.floor(deferredScrollTop / itemHeight) - overscan);
    const visibleCount = Math.ceil(containerHeight / itemHeight);
    const end = Math.min(items.length - 1, start + visibleCount + overscan * 2);

    return {
      startIndex: start,
      endIndex: end,
      offsetY: start * itemHeight,
    };
  }, [deferredScrollTop, itemHeight, containerHeight, items.length, overscan]);

  // Get visible items
  const visibleItems = useMemo(
    () => items.slice(startIndex, endIndex + 1),
    [items, startIndex, endIndex]
  );

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  const totalHeight = items.length * itemHeight;

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      style={{
        height: containerHeight,
        overflow: 'auto',
        position: 'relative',
      }}
    >
      {/* Spacer for total scroll height */}
      <div style={{ height: totalHeight, position: 'relative' }}>
        {/* Visible items container */}
        <div
          style={{
            position: 'absolute',
            top: offsetY,
            left: 0,
            right: 0,
            opacity: isScrolling ? 0.7 : 1,
            transition: 'opacity 0.1s',
          }}
        >
          {visibleItems.map((item, index) => (
            <ItemRow
              key={item.id}
              item={item}
              height={itemHeight}
              isPlaceholder={isScrolling}
            />
          ))}
        </div>
      </div>

      {/* Scrolling indicator */}
      {isScrolling && (
        <div
          style={{
            position: 'absolute',
            top: 10,
            right: 10,
            background: 'rgba(0,0,0,0.7)',
            color: 'white',
            padding: '4px 8px',
            borderRadius: 4,
            fontSize: 12,
          }}
        >
          Scrolling...
        </div>
      )}
    </div>
  );
}

// =============================================================================
// ITEM ROW COMPONENT
// =============================================================================

interface ItemRowProps {
  item: Item;
  height: number;
  isPlaceholder?: boolean;
}

function ItemRow({ item, height, isPlaceholder }: ItemRowProps) {
  // Show simplified version while scrolling for performance
  if (isPlaceholder) {
    return (
      <div
        style={{
          height,
          display: 'flex',
          alignItems: 'center',
          padding: '8px 16px',
          borderBottom: '1px solid #eee',
          background: '#fafafa',
        }}
      >
        <div
          style={{
            width: 60,
            height: 60,
            background: '#ddd',
            borderRadius: 4,
            marginRight: 16,
          }}
        />
        <div style={{ flex: 1 }}>
          <div style={{ height: 16, background: '#ddd', width: '60%', marginBottom: 8 }} />
          <div style={{ height: 12, background: '#eee', width: '80%' }} />
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        height,
        display: 'flex',
        alignItems: 'center',
        padding: '8px 16px',
        borderBottom: '1px solid #eee',
        background: 'white',
      }}
    >
      <img
        src={item.imageUrl}
        alt={item.title}
        style={{
          width: 60,
          height: 60,
          borderRadius: 4,
          marginRight: 16,
          objectFit: 'cover',
        }}
        loading="lazy"
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontWeight: 'bold',
            marginBottom: 4,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {item.title}
        </div>
        <div
          style={{
            fontSize: 14,
            color: '#666',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {item.description}
        </div>
        <div style={{ fontSize: 12, color: '#999', marginTop: 4 }}>
          {item.category} • {new Date(item.timestamp).toLocaleTimeString()}
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// LOADING INDICATOR
// =============================================================================

function LoadingIndicator() {
  return (
    <div
      style={{
        padding: 20,
        textAlign: 'center',
        color: '#666',
      }}
    >
      <div
        style={{
          width: 24,
          height: 24,
          border: '3px solid #eee',
          borderTopColor: '#333',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          margin: '0 auto 8px',
        }}
      />
      Loading more items...
    </div>
  );
}

// =============================================================================
// MAIN INFINITE SCROLL COMPONENT
// =============================================================================

export function InfiniteScrollList() {
  const [items, setItems] = useState<Item[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isPending, startTransition] = useTransition();

  const containerRef = useRef<HTMLDivElement>(null);
  const loadingRef = useRef<HTMLDivElement>(null);

  const PAGE_SIZE = 50;
  const ITEM_HEIGHT = 100;
  const CONTAINER_HEIGHT = 600;

  // Initial load
  useEffect(() => {
    loadMore();
  }, []);

  // Intersection Observer for infinite scroll
  useEffect(() => {
    if (!loadingRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isPending) {
          loadMore();
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(loadingRef.current);

    return () => observer.disconnect();
  }, [hasMore, isPending]);

  const loadMore = useCallback(() => {
    startTransition(async () => {
      try {
        const newItems = await fetchItems(page, PAGE_SIZE);

        if (newItems.length < PAGE_SIZE) {
          setHasMore(false);
        }

        setItems((prev) => [...prev, ...newItems]);
        setPage((p) => p + 1);
      } catch (error) {
        console.error('Failed to load items:', error);
      }
    });
  }, [page]);

  // Defer the items array for smoother updates
  const deferredItems = useDeferredValue(items);
  const isStale = items !== deferredItems;

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', fontFamily: 'system-ui' }}>
      <div
        style={{
          padding: 16,
          borderBottom: '1px solid #eee',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <h2 style={{ margin: 0 }}>Infinite Scroll Demo</h2>
        <span style={{ color: '#666', fontSize: 14 }}>
          {items.length} items loaded
          {isStale && ' (updating...)'}
        </span>
      </div>

      <div style={{ position: 'relative' }}>
        <VirtualizedList
          items={deferredItems}
          itemHeight={ITEM_HEIGHT}
          containerHeight={CONTAINER_HEIGHT}
          overscan={5}
        />

        {/* Loading trigger element */}
        <div ref={loadingRef} style={{ height: 1 }} />

        {/* Loading indicator */}
        {isPending && <LoadingIndicator />}

        {/* End of list */}
        {!hasMore && (
          <div
            style={{
              padding: 20,
              textAlign: 'center',
              color: '#999',
            }}
          >
            No more items to load
          </div>
        )}
      </div>

      {/* CSS for spinner animation */}
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

// =============================================================================
// ADVANCED: WITH FILTERING
// =============================================================================

export function InfiniteScrollWithFilter() {
  const [allItems, setAllItems] = useState<Item[]>([]);
  const [filter, setFilter] = useState('');
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isPending, startTransition] = useTransition();

  const loadingRef = useRef<HTMLDivElement>(null);

  const PAGE_SIZE = 50;
  const ITEM_HEIGHT = 100;
  const CONTAINER_HEIGHT = 500;

  // Defer filter for smooth typing
  const deferredFilter = useDeferredValue(filter);
  const isFiltering = filter !== deferredFilter;

  // Filter items (expensive operation)
  const filteredItems = useMemo(() => {
    if (!deferredFilter) return allItems;

    const lowerFilter = deferredFilter.toLowerCase();
    return allItems.filter(
      (item) =>
        item.title.toLowerCase().includes(lowerFilter) ||
        item.description.toLowerCase().includes(lowerFilter) ||
        item.category.toLowerCase().includes(lowerFilter)
    );
  }, [allItems, deferredFilter]);

  // Initial load
  useEffect(() => {
    loadMore();
  }, []);

  // Intersection Observer
  useEffect(() => {
    if (!loadingRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isPending && !filter) {
          loadMore();
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(loadingRef.current);
    return () => observer.disconnect();
  }, [hasMore, isPending, filter]);

  const loadMore = useCallback(() => {
    startTransition(async () => {
      const newItems = await fetchItems(page, PAGE_SIZE);

      if (newItems.length < PAGE_SIZE) {
        setHasMore(false);
      }

      setAllItems((prev) => [...prev, ...newItems]);
      setPage((p) => p + 1);
    });
  }, [page]);

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', fontFamily: 'system-ui' }}>
      <div style={{ padding: 16, borderBottom: '1px solid #eee' }}>
        <h2 style={{ margin: '0 0 16px' }}>Infinite Scroll with Filter</h2>

        <input
          type="text"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filter items..."
          style={{
            width: '100%',
            padding: '12px 16px',
            fontSize: 16,
            border: '1px solid #ddd',
            borderRadius: 8,
            boxSizing: 'border-box',
          }}
        />

        <div
          style={{
            marginTop: 8,
            fontSize: 14,
            color: '#666',
            display: 'flex',
            justifyContent: 'space-between',
          }}
        >
          <span>
            Showing {filteredItems.length} of {allItems.length} items
          </span>
          {isFiltering && <span>Filtering...</span>}
        </div>
      </div>

      <div style={{ opacity: isFiltering ? 0.6 : 1, transition: 'opacity 0.2s' }}>
        <VirtualizedList
          items={filteredItems}
          itemHeight={ITEM_HEIGHT}
          containerHeight={CONTAINER_HEIGHT}
          overscan={5}
        />

        <div ref={loadingRef} style={{ height: 1 }} />

        {isPending && !filter && <LoadingIndicator />}

        {!hasMore && !filter && (
          <div style={{ padding: 20, textAlign: 'center', color: '#999' }}>
            End of list
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

// =============================================================================
// EXPORTS
// =============================================================================

export default InfiniteScrollList;
