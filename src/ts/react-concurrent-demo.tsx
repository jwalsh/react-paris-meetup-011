/**
 * React 19 Concurrency Demo
 * React Paris Meetup #011
 *
 * Demonstrates useTransition, useDeferredValue, Suspense, and Activity
 */

import React, {
  useState,
  useTransition,
  useDeferredValue,
  Suspense,
  useMemo,
  use,
  // Activity is experimental in React 19.2
  // @ts-ignore - Activity may not be in types yet
  Activity,
} from 'react';

// =============================================================================
// TYPES
// =============================================================================

interface Item {
  id: number;
  name: string;
  category: string;
}

interface User {
  id: number;
  name: string;
  email: string;
}

// =============================================================================
// SIMULATED DATA & FETCHING
// =============================================================================

// Simulate expensive filtering
function expensiveFilter(items: Item[], query: string): Item[] {
  // Simulate CPU-intensive work
  const start = performance.now();
  while (performance.now() - start < 50) {
    // Block for 50ms to simulate expensive computation
  }

  return items.filter(
    (item) =>
      item.name.toLowerCase().includes(query.toLowerCase()) ||
      item.category.toLowerCase().includes(query.toLowerCase())
  );
}

// Generate sample data
function generateItems(count: number): Item[] {
  const categories = ['Electronics', 'Books', 'Clothing', 'Home', 'Sports'];
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    name: `Item ${i}`,
    category: categories[i % categories.length],
  }));
}

// Cache for promises (required for use() hook)
const promiseCache = new Map<string, Promise<any>>();

function fetchUser(id: number): Promise<User> {
  const key = `user-${id}`;
  if (!promiseCache.has(key)) {
    promiseCache.set(
      key,
      new Promise((resolve) => {
        setTimeout(() => {
          resolve({
            id,
            name: `User ${id}`,
            email: `user${id}@example.com`,
          });
        }, 1000);
      })
    );
  }
  return promiseCache.get(key)!;
}

// =============================================================================
// DEMO 1: useTransition for non-urgent updates
// =============================================================================

export function TransitionDemo() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Item[]>([]);
  const [isPending, startTransition] = useTransition();

  const allItems = useMemo(() => generateItems(10000), []);

  function handleSearch(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value;

    // URGENT: Update input immediately
    setQuery(value);

    // NON-URGENT: Filter can be deferred
    startTransition(() => {
      const filtered = expensiveFilter(allItems, value);
      setResults(filtered);
    });
  }

  return (
    <div className="demo-section">
      <h2>useTransition Demo</h2>
      <p>Input stays responsive even during expensive filtering</p>

      <input
        type="text"
        value={query}
        onChange={handleSearch}
        placeholder="Search 10,000 items..."
        style={{ padding: '8px', fontSize: '16px', width: '300px' }}
      />

      {isPending && <span className="spinner"> Filtering...</span>}

      <div style={{ marginTop: '16px', opacity: isPending ? 0.7 : 1 }}>
        <p>Showing {results.length} results</p>
        <ul style={{ maxHeight: '200px', overflow: 'auto' }}>
          {results.slice(0, 20).map((item) => (
            <li key={item.id}>
              {item.name} - {item.category}
            </li>
          ))}
          {results.length > 20 && <li>...and {results.length - 20} more</li>}
        </ul>
      </div>
    </div>
  );
}

// =============================================================================
// DEMO 2: useDeferredValue for derived values
// =============================================================================

interface SlowListProps {
  query: string;
}

function SlowList({ query }: SlowListProps) {
  const items = useMemo(() => {
    const allItems = generateItems(5000);
    return expensiveFilter(allItems, query);
  }, [query]);

  return (
    <ul style={{ maxHeight: '200px', overflow: 'auto' }}>
      {items.slice(0, 20).map((item) => (
        <li key={item.id}>
          {item.name} - {item.category}
        </li>
      ))}
    </ul>
  );
}

export function DeferredValueDemo() {
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);

  // Show stale indicator
  const isStale = query !== deferredQuery;

  return (
    <div className="demo-section">
      <h2>useDeferredValue Demo</h2>
      <p>Simpler API when you dont control the state update</p>

      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search items..."
        style={{ padding: '8px', fontSize: '16px', width: '300px' }}
      />

      <div style={{ marginTop: '16px', opacity: isStale ? 0.5 : 1 }}>
        {isStale && <p>Updating...</p>}
        <SlowList query={deferredQuery} />
      </div>
    </div>
  );
}

// =============================================================================
// DEMO 3: Suspense with use() hook
// =============================================================================

interface UserProfileProps {
  userId: number;
}

function UserProfile({ userId }: UserProfileProps) {
  // use() suspends until the promise resolves
  const user = use(fetchUser(userId));

  return (
    <div className="user-card">
      <h3>{user.name}</h3>
      <p>Email: {user.email}</p>
    </div>
  );
}

function UserSkeleton() {
  return (
    <div className="user-card skeleton">
      <div className="skeleton-line" style={{ width: '60%', height: '24px' }} />
      <div className="skeleton-line" style={{ width: '80%', height: '16px' }} />
    </div>
  );
}

export function SuspenseDemo() {
  const [userId, setUserId] = useState(1);

  return (
    <div className="demo-section">
      <h2>Suspense + use() Demo</h2>
      <p>Declarative loading states with the new use() hook</p>

      <div>
        <button onClick={() => setUserId((id) => id + 1)}>Load Next User</button>
        <span style={{ marginLeft: '8px' }}>User ID: {userId}</span>
      </div>

      <Suspense fallback={<UserSkeleton />}>
        <UserProfile userId={userId} />
      </Suspense>
    </div>
  );
}

// =============================================================================
// DEMO 4: Activity for state preservation (React 19.2)
// =============================================================================

function Counter() {
  const [count, setCount] = useState(0);

  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={() => setCount((c) => c + 1)}>Increment</button>
    </div>
  );
}

export function ActivityDemo() {
  const [activeTab, setActiveTab] = useState<'home' | 'counter'>('home');

  // Note: Activity is experimental and may not be available
  const ActivityComponent = Activity || 'div';

  return (
    <div className="demo-section">
      <h2>Activity Demo (React 19.2)</h2>
      <p>State is preserved when tabs are hidden</p>

      <div className="tabs">
        <button
          className={activeTab === 'home' ? 'active' : ''}
          onClick={() => setActiveTab('home')}
        >
          Home
        </button>
        <button
          className={activeTab === 'counter' ? 'active' : ''}
          onClick={() => setActiveTab('counter')}
        >
          Counter
        </button>
      </div>

      {/* Home tab - state preserved when hidden */}
      <ActivityComponent mode={activeTab === 'home' ? 'visible' : 'hidden'}>
        <div className="tab-content">
          <h3>Home Tab</h3>
          <p>Welcome to the home tab!</p>
        </div>
      </ActivityComponent>

      {/* Counter tab - count is preserved when switching tabs */}
      <ActivityComponent mode={activeTab === 'counter' ? 'visible' : 'hidden'}>
        <div className="tab-content">
          <h3>Counter Tab</h3>
          <Counter />
          <p>
            <em>Try incrementing, switching tabs, and coming back!</em>
          </p>
        </div>
      </ActivityComponent>
    </div>
  );
}

// =============================================================================
// DEMO 5: Combined Pattern - Responsive Tabs
// =============================================================================

function ExpensiveContent({ name }: { name: string }) {
  // Simulate expensive render
  const items = useMemo(() => generateItems(1000), []);

  return (
    <div>
      <h3>{name} Content</h3>
      <p>Rendered {items.length} items</p>
    </div>
  );
}

export function CombinedDemo() {
  const [activeTab, setActiveTab] = useState<'a' | 'b' | 'c'>('a');
  const [isPending, startTransition] = useTransition();

  function switchTab(tab: 'a' | 'b' | 'c') {
    startTransition(() => {
      setActiveTab(tab);
    });
  }

  const ActivityComponent = Activity || 'div';

  return (
    <div className="demo-section">
      <h2>Combined Pattern Demo</h2>
      <p>useTransition + Activity + Suspense working together</p>

      <div className="tabs">
        {(['a', 'b', 'c'] as const).map((tab) => (
          <button
            key={tab}
            className={activeTab === tab ? 'active' : ''}
            onClick={() => switchTab(tab)}
          >
            Tab {tab.toUpperCase()}
            {isPending && activeTab !== tab && ' ...'}
          </button>
        ))}
      </div>

      {isPending && <p className="pending-indicator">Switching...</p>}

      {(['a', 'b', 'c'] as const).map((tab) => (
        <ActivityComponent key={tab} mode={activeTab === tab ? 'visible' : 'hidden'}>
          <Suspense fallback={<div>Loading {tab}...</div>}>
            <div className="tab-content">
              <ExpensiveContent name={`Tab ${tab.toUpperCase()}`} />
            </div>
          </Suspense>
        </ActivityComponent>
      ))}
    </div>
  );
}

// =============================================================================
// MAIN APP
// =============================================================================

export function App() {
  return (
    <div className="app">
      <h1>React 19 Concurrency Demo</h1>
      <p>React Paris Meetup #011</p>

      <TransitionDemo />
      <hr />
      <DeferredValueDemo />
      <hr />
      <SuspenseDemo />
      <hr />
      <ActivityDemo />
      <hr />
      <CombinedDemo />
    </div>
  );
}

export default App;
