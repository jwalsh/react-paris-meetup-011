# React Paris Meetup #011: Concurrency in React 19

Presentation and code examples for React Paris Meetup #011 covering concurrency patterns in React 19, with comparisons to ClojureScript (Reagent, re-frame, core.async).

## Quick Links

- [Presentation (PDF)](./presentation.pdf)
- [Presentation (Org)](./presentation.org)
- [Practice Projects](./docs/projects.org)
- [Reagent/re-frame Deep Dive](./docs/reagent-reframe-deep-dive.org)

## Topics Covered

### Concurrency vs Parallelism
- JavaScript's event loop model
- Single-threaded concurrency
- Web Workers for true parallelism

### React Evolution (v10-19)
| Version | Year | Key Concurrency Features |
|---------|------|--------------------------|
| 10-15 | 2014-2016 | Stack reconciler (synchronous) |
| 16 | 2017 | Fiber architecture (foundation) |
| 16.6 | 2018 | Suspense for code splitting |
| 17 | 2020 | Gradual upgrades, event delegation |
| 18 | 2022 | Concurrent rendering, useTransition |
| 19 | 2024 | use() hook, Actions, improved Suspense |
| 19.2 | 2025 | Activity API, useEffectEvent |

### React 19 Primitives
- `<Suspense>` - Async loading boundaries
- `<Activity>` - Show/hide without unmount (React 19.2)
- `useTransition` - Mark updates as non-urgent
- `useDeferredValue` - Defer expensive computations
- `use()` - Unwrap promises in render

### ClojureScript Comparison
- **core.async** - CSP-style channels and go blocks
- **Reagent** - React wrapper with reactive atoms
- **re-frame** - Unidirectional data flow framework

## Running the Examples

### Infinite Scroll - React 19

```bash
cd examples/infinite-scroll-react

# Create new React 19 project
npx create-react-app my-demo --template typescript
cd my-demo
npm install react@19 react-dom@19

# Copy InfiniteScroll.tsx to src/
# Update App.tsx to import and render <InfiniteScrollList />

npm start
```

### Infinite Scroll - Reagent/re-frame

```bash
cd examples/infinite-scroll-reagent

# Install shadow-cljs globally (or use npx)
npm install -g shadow-cljs

# Install dependencies and start dev server
npm install
shadow-cljs watch app

# Open http://localhost:8080
```

## Project Structure

```
.
├── presentation.org          # Main presentation (org-mode)
├── presentation.pdf          # Generated PDF
├── docs/
│   ├── projects.org          # 10 practice project specs
│   └── reagent-reframe-deep-dive.org
├── src/
│   ├── ts/
│   │   ├── concurrency.ts    # Throttle/debounce utilities
│   │   └── react-concurrent-demo.tsx
│   └── cljs/
│       └── concurrency/
│           └── core.cljs     # core.async examples
└── examples/
    ├── infinite-scroll-react/
    │   ├── InfiniteScroll.tsx
    │   └── index.html
    └── infinite-scroll-reagent/
        ├── shadow-cljs.edn
        ├── deps.edn
        ├── public/index.html
        └── src/infinite_scroll/core.cljs
```

## Practice Projects

10 projects designed to practice concurrency patterns:

1. **Typeahead Search** - useDeferredValue / debounce
2. **Modal Dialog System** - Activity pre-rendering
3. **Infinite Scroll** - Throttle + virtualization *(implemented)*
4. **Form Validation** - Async validation + debounce
5. **Image Carousel** - Preloading + transitions
6. **Notifications** - Priority queuing
7. **Data Table** - Deferred sort/filter
8. **Multi-step Wizard** - Step pre-rendering
9. **Collaborative Editor** - Optimistic updates + merging
10. **Live Dashboard** - Staggered refresh + isolation

See [docs/projects.org](./docs/projects.org) for full specifications.

## Key Concepts

### React 19 Concurrent Rendering

```typescript
// Defer expensive computation
const deferredQuery = useDeferredValue(query);
const isStale = query !== deferredQuery;

// Mark updates as non-urgent
const [isPending, startTransition] = useTransition();
startTransition(() => {
  setFilteredItems(expensiveFilter(items, query));
});

// Pre-render hidden content (React 19.2)
<Activity mode={isActive ? "visible" : "hidden"}>
  <ExpensiveComponent />
</Activity>
```

### ClojureScript core.async

```clojure
;; Debounce with channels
(defn debounce [in-ch ms]
  (let [out-ch (chan)]
    (go-loop [last-val nil]
      (let [[val port] (alts! [in-ch (timeout ms)])]
        (if (= port in-ch)
          (recur val)
          (when last-val
            (>! out-ch last-val)
            (recur nil)))))
    out-ch))
```

## Reagent/re-frame Status (2025)

| React Version | Reagent Support | Notes |
|---------------|-----------------|-------|
| React 17 | Full | Stable, production-ready |
| React 18 | Partial | Legacy render API works |
| React 19 | Incompatible | Class component conflicts |

**Alternatives**: UIx2, Helix, HSX/RFX

## Resources

- [React 19 Blog Post](https://react.dev/blog/2024/12/05/react-19)
- [React 18 Release Notes](https://react.dev/blog/2022/03/29/react-v18)
- [Suspense Documentation](https://react.dev/reference/react/Suspense)
- [useTransition Documentation](https://react.dev/reference/react/useTransition)
- [Reagent Project](https://reagent-project.github.io/)
- [re-frame Documentation](https://day8.github.io/re-frame/)
- [Clojure core.async](https://clojure.org/news/2013/06/28/clojure-clore-async-channels)

## License

MIT
