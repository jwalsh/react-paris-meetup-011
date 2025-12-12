# React Paris Meetup #011

[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat&logo=react&logoColor=white)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![ClojureScript](https://img.shields.io/badge/ClojureScript-1.11-5881D8?style=flat&logo=clojure&logoColor=white)](https://clojurescript.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](http://makeapullrequest.com)

> Companion materials for React Paris Meetup #011 covering React 19 concurrency patterns with ClojureScript comparisons.

📅 **Date**: December 10, 2025
📍 **Location**: L'Atelier, 56 Rue de l'Arbre Sec, 75001 Paris
🔗 **Meetup**: [react-paris](https://www.meetup.com/react-paris/)

---

## 📣 Talks

### Talk 1: Conquering React Concurrency
**Ariel Shulman** · *Full Stack Developer @ Factify*

Deep dive into React's concurrent rendering model, from Fiber architecture (React 16) to the Activity API (React 19.2). Covers useTransition, useDeferredValue, Suspense, and practical patterns for building responsive UIs.

### Talk 2: Évolution des librairies UI et futures problématiques
**Théo Senoussaoui** · *Frontend Developer, Paris*

The evolution of headless UI libraries (Radix, Headless UI, Ark UI), technical choices behind them, how to select the right one, and emerging challenges like Radix's shift to Base UI.

---

## 📚 Table of Contents

- [Quick Links](#-quick-links)
- [Topics Covered](#-topics-covered)
- [Running the Examples](#-running-the-examples)
- [Project Structure](#-project-structure)
- [Practice Projects](#-practice-projects)
- [Key Concepts](#-key-concepts)
- [Resources](#-resources)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🔗 Quick Links

| Document | Description |
|----------|-------------|
| [📄 Presentation (PDF)](./presentation.pdf) | Main slides |
| [📝 Presentation (Org)](./presentation.org) | Source for slides |
| [🎨 Talk 2: UI Libraries](./docs/talk2-ui-libraries-evolution.org) | Headless UI deep dive |
| [🛠 Practice Projects](./docs/projects.org) | 10 project specifications |
| [⚗️ Reagent Deep Dive](./docs/reagent-reframe-deep-dive.org) | ClojureScript React wrappers |
| [🔮 Future Topics](./docs/future-meetup-topics.org) | Ideas for #012 and #013 |

---

## 📖 Topics Covered

### Concurrency vs Parallelism

| Concept | Description | Example |
|---------|-------------|---------|
| **Concurrency** | Managing multiple tasks (interleaved) | JavaScript event loop, React Fiber |
| **Parallelism** | Executing multiple tasks (simultaneous) | Web Workers, multi-core |

### React Evolution (v16-19)

```
2017 ─── React 16 ─── Fiber Architecture (foundation)
         │
2018 ─── React 16.6 ─ Suspense for code splitting
         │
2020 ─── React 17 ─── Gradual upgrades, event delegation
         │
2022 ─── React 18 ─── Concurrent rendering, useTransition ⭐
         │
2024 ─── React 19 ─── use() hook, Actions, improved Suspense ⭐
         │
2025 ─── React 19.2 ─ Activity API, useEffectEvent ⭐
```

### React 19 Primitives

| Primitive | Purpose | Priority |
|-----------|---------|----------|
| `<Suspense>` | Async loading boundaries | Normal |
| `<Activity>` | Show/hide without unmount | Variable |
| `useTransition` | Mark updates as non-urgent | Low |
| `useDeferredValue` | Defer expensive computations | Low |
| `use()` | Unwrap promises in render | Normal |

### ClojureScript Ecosystem

| Library | Purpose | React Equivalent |
|---------|---------|------------------|
| **core.async** | CSP-style channels | Async coordination |
| **Reagent** | React wrapper with RAtoms | React + useState |
| **re-frame** | Unidirectional data flow | Redux pattern |

---

## 🚀 Running the Examples

### Prerequisites

- Node.js 18+
- npm or yarn
- (For ClojureScript) Java 11+ and Clojure CLI

### Infinite Scroll - React 19

```bash
# Navigate to example
cd examples/infinite-scroll-react

# Option 1: Use with existing React 19 project
# Copy InfiniteScroll.tsx to your src/ folder

# Option 2: Create new project
npx create-react-app my-demo --template typescript
cd my-demo
npm install react@19 react-dom@19

# Copy InfiniteScroll.tsx to src/
# Update App.tsx:
#   import { InfiniteScrollList } from './InfiniteScroll';
#   export default function App() { return <InfiniteScrollList />; }

npm start
```

### Infinite Scroll - Reagent/re-frame

```bash
# Navigate to example
cd examples/infinite-scroll-reagent

# Install shadow-cljs
npm install -g shadow-cljs

# Start development server
shadow-cljs watch app

# Open http://localhost:8080
```

---

## 📁 Project Structure

```
react-paris-meetup-011/
├── 📄 README.md
├── 📊 presentation.org          # Main presentation (org-mode)
├── 📊 presentation.pdf          # Generated PDF (229KB)
├── 📝 notes.org                 # Detailed talk notes
├── 📝 setup.org                 # Event setup notes
│
├── 📂 docs/
│   ├── projects.org             # 10 practice project specs
│   ├── reagent-reframe-deep-dive.org
│   ├── talk2-ui-libraries-evolution.org
│   └── future-meetup-topics.org
│
├── 📂 src/
│   ├── ts/
│   │   ├── concurrency.ts       # Throttle/debounce/scheduler
│   │   └── react-concurrent-demo.tsx
│   └── cljs/
│       └── concurrency/
│           └── core.cljs        # core.async examples
│
└── 📂 examples/
    ├── infinite-scroll-react/   # React 19 implementation
    │   ├── InfiniteScroll.tsx   # 500+ lines, full demo
    │   └── index.html
    └── infinite-scroll-reagent/ # ClojureScript implementation
        ├── shadow-cljs.edn
        ├── deps.edn
        └── src/infinite_scroll/core.cljs
```

---

## 🛠 Practice Projects

10 projects designed to practice concurrency patterns:

| # | Project | Key Pattern | Difficulty |
|---|---------|-------------|------------|
| 1 | Typeahead Search | `useDeferredValue` / debounce | ⭐ |
| 2 | Modal Dialog System | Activity pre-rendering | ⭐ |
| 3 | **Infinite Scroll** | Throttle + virtualization | ⭐⭐ |
| 4 | Form Validation | Async validation + debounce | ⭐⭐ |
| 5 | Image Carousel | Preloading + transitions | ⭐⭐ |
| 6 | Notifications | Priority queuing | ⭐⭐ |
| 7 | Data Table | Deferred sort/filter | ⭐⭐⭐ |
| 8 | Multi-step Wizard | Step pre-rendering | ⭐⭐ |
| 9 | Collaborative Editor | Optimistic updates + merging | ⭐⭐⭐ |
| 10 | Live Dashboard | Staggered refresh + isolation | ⭐⭐⭐ |

**Bold** = implemented in this repo. See [docs/projects.org](./docs/projects.org) for full specifications.

---

## 💡 Key Concepts

### React 19 Concurrent Rendering

```typescript
import { useState, useTransition, useDeferredValue } from 'react';

function SearchResults() {
  const [query, setQuery] = useState('');
  const [isPending, startTransition] = useTransition();

  // Defer expensive computation
  const deferredQuery = useDeferredValue(query);
  const isStale = query !== deferredQuery;

  function handleSearch(e: React.ChangeEvent<HTMLInputElement>) {
    // Urgent: update input immediately
    setQuery(e.target.value);

    // Non-urgent: filter can be interrupted
    startTransition(() => {
      setResults(expensiveFilter(items, e.target.value));
    });
  }

  return (
    <div style={{ opacity: isStale ? 0.7 : 1 }}>
      <input value={query} onChange={handleSearch} />
      {isPending && <Spinner />}
      <ResultsList query={deferredQuery} />
    </div>
  );
}
```

### ClojureScript core.async

```clojure
(ns demo.concurrency
  (:require [cljs.core.async :refer [chan go <! >! timeout alts!]]))

;; Debounce with channels
(defn debounce [in-ch ms]
  (let [out-ch (chan)]
    (go-loop [last-val nil]
      (let [[val port] (alts! [in-ch (timeout ms)])]
        (if (= port in-ch)
          (recur val)              ; New value, restart timer
          (when last-val
            (>! out-ch last-val)   ; Timeout, emit value
            (recur nil)))))
    out-ch))
```

---

## 📊 Reagent/re-frame Status (2025)

| React Version | Reagent Support | Notes |
|---------------|-----------------|-------|
| React 17 | ✅ Full | Stable, production-ready |
| React 18 | ⚠️ Partial | Legacy render API works |
| React 19 | ❌ Incompatible | Class component conflicts |

**Modern Alternatives:**
- [UIx2](https://github.com/pitch-io/uix) - Hooks-first wrapper
- [Helix](https://github.com/lilactown/helix) - Modern ClojureScript React
- HSX/RFX - Custom Hiccup + hooks solutions

---

## 📚 Resources

### Official Documentation
- [React 19 Blog Post](https://react.dev/blog/2024/12/05/react-19)
- [React 18 Release Notes](https://react.dev/blog/2022/03/29/react-v18)
- [Suspense Documentation](https://react.dev/reference/react/Suspense)
- [useTransition Documentation](https://react.dev/reference/react/useTransition)

### ClojureScript
- [Reagent Project](https://reagent-project.github.io/)
- [re-frame Documentation](https://day8.github.io/re-frame/)
- [core.async Guide](https://clojure.org/news/2013/06/28/clojure-clore-async-channels)

### UI Libraries (Talk 2)
- [Radix UI](https://www.radix-ui.com/)
- [shadcn/ui](https://ui.shadcn.com/)
- [React Aria (Adobe)](https://react-spectrum.adobe.com/react-aria/)
- [Headless UI](https://headlessui.com/)

### Community
- [React Paris Meetup](https://www.meetup.com/react-paris/)
- [React Paris GitHub](https://github.com/ReactParis)
- [@ReactjsParis on Twitter](https://twitter.com/ReactjsParis)

---

## 🤝 Contributing

Contributions are welcome! Here's how you can help:

1. **Add a practice project implementation** - Pick from the 10 projects
2. **Improve documentation** - Fix typos, add examples
3. **Translate content** - French translations welcome
4. **Report issues** - Found a bug or have a suggestion?

```bash
# Fork and clone
git clone https://github.com/YOUR_USERNAME/react-paris-meetup-011.git

# Create a branch
git checkout -b feature/your-feature

# Make changes and commit
git commit -m "feat: add your feature"

# Push and create PR
git push origin feature/your-feature
```

---

## 👏 Acknowledgments

- **Ariel Shulman** - Talk 1: Conquering React Concurrency
- **Théo Senoussaoui** - Talk 2: Évolution des librairies UI
- **React Paris Organizers** - Gabriel P. and team
- **L'Atelier** - Venue host

---

## 📄 License

MIT © 2025 React Paris Meetup

---

<p align="center">
  Made with ❤️ for the React Paris community
</p>
