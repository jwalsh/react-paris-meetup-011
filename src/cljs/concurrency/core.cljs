(ns concurrency.core
  "Concurrency patterns using ClojureScript core.async
   React Paris Meetup #011

   Demonstrates CSP-style concurrency with channels and go blocks,
   comparing to React's concurrent rendering model."
  (:require [cljs.core.async :refer [chan go go-loop <! >! put! take!
                                      timeout alts! close!
                                      sliding-buffer dropping-buffer]]
            [cljs.core.async.interop :refer-macros [<p!]]))

;; =============================================================================
;; BASIC CHANNEL OPERATIONS
;; =============================================================================

(defn basic-channel-demo
  "Demonstrates basic channel put and take operations"
  []
  (let [ch (chan)]
    ;; Producer
    (go
      (println "Producer: Sending values...")
      (doseq [i (range 5)]
        (>! ch i)
        (println "Producer: Sent" i))
      (close! ch)
      (println "Producer: Channel closed"))

    ;; Consumer
    (go-loop []
      (when-let [val (<! ch)]
        (println "Consumer: Received" val)
        (recur))
      (println "Consumer: Channel closed, done"))))

;; =============================================================================
;; THROTTLE: Limit message rate through a channel
;; =============================================================================

(defn throttle
  "Returns a channel that throttles values from in-ch.
   Only allows one value through every `ms` milliseconds."
  [in-ch ms]
  (let [out-ch (chan)]
    (go-loop []
      (when-let [val (<! in-ch)]
        (>! out-ch val)
        (<! (timeout ms))  ; Wait before allowing next value
        (recur))
      (close! out-ch))
    out-ch))

(defn throttle-demo
  "Demonstrates throttling - max one event per 200ms"
  []
  (let [input-ch (chan)
        throttled-ch (throttle input-ch 200)]

    ;; Consumer
    (go-loop []
      (when-let [val (<! throttled-ch)]
        (println "Throttled output:" val "at" (.now js/Date))
        (recur)))

    ;; Producer: rapid-fire inputs
    (go
      (doseq [i (range 10)]
        (>! input-ch i)
        (println "Input:" i "at" (.now js/Date))
        (<! (timeout 50)))  ; Send every 50ms
      (close! input-ch))))

;; =============================================================================
;; DEBOUNCE: Wait for quiet period before emitting
;; =============================================================================

(defn debounce
  "Returns a channel that debounces values from in-ch.
   Only emits after `ms` milliseconds of no new values."
  [in-ch ms]
  (let [out-ch (chan)]
    (go-loop [last-val nil]
      (let [[val port] (alts! [in-ch (timeout ms)])]
        (cond
          ;; New value came in - store it and restart timer
          (= port in-ch)
          (if (nil? val)
            (close! out-ch)  ; Input closed
            (recur val))

          ;; Timeout fired - emit last value if we have one
          last-val
          (do
            (>! out-ch last-val)
            (recur nil))

          ;; Timeout but no value - keep waiting
          :else
          (recur nil))))
    out-ch))

(defn debounce-demo
  "Demonstrates debouncing - emits after 300ms quiet period"
  []
  (let [input-ch (chan)
        debounced-ch (debounce input-ch 300)]

    ;; Consumer
    (go-loop []
      (when-let [val (<! debounced-ch)]
        (println "Debounced output:" val "at" (.now js/Date))
        (recur)))

    ;; Producer: burst of inputs, then pause
    (go
      (println "Sending burst of values...")
      (doseq [i (range 5)]
        (>! input-ch i)
        (<! (timeout 50)))  ; Rapid inputs

      (<! (timeout 500))  ; Pause

      (println "Sending another burst...")
      (doseq [i (range 5 10)]
        (>! input-ch i)
        (<! (timeout 50)))

      (<! (timeout 500))
      (close! input-ch))))

;; =============================================================================
;; SEQUENCER: Process operations in order
;; =============================================================================

(defn sequencer
  "Creates a sequencer that processes async operations in order.
   Returns a function that takes an operation and returns a channel
   with the result."
  []
  (let [queue-ch (chan)]
    ;; Worker that processes operations sequentially
    (go-loop []
      (when-let [{:keys [operation result-ch]} (<! queue-ch)]
        (try
          (let [result (<! (operation))]
            (>! result-ch result))
          (catch js/Error e
            (>! result-ch {:error (.-message e)})))
        (close! result-ch)
        (recur)))

    ;; Return function to queue operations
    (fn [operation]
      (let [result-ch (chan 1)]
        (put! queue-ch {:operation operation :result-ch result-ch})
        result-ch))))

(defn sequencer-demo
  "Demonstrates sequential processing of async operations"
  []
  (let [seq-fn (sequencer)]
    ;; Queue several operations
    (go
      (println "Queuing operations...")

      ;; These complete in order despite different delays
      (let [r1-ch (seq-fn #(go (<! (timeout 300)) "First (300ms)"))
            r2-ch (seq-fn #(go (<! (timeout 100)) "Second (100ms)"))
            r3-ch (seq-fn #(go (<! (timeout 200)) "Third (200ms)"))]

        (println "Result 1:" (<! r1-ch))
        (println "Result 2:" (<! r2-ch))
        (println "Result 3:" (<! r3-ch))))))

;; =============================================================================
;; PRIORITY CHANNELS: Similar to React's priority lanes
;; =============================================================================

(defn priority-scheduler
  "Creates a priority-based task scheduler.
   Tasks with higher priority (lower number) are processed first."
  []
  (let [immediate-ch (chan 10)
        high-ch (chan 10)
        normal-ch (chan 10)
        low-ch (chan 10)
        idle-ch (chan 10)]

    ;; Worker that processes by priority
    (go-loop []
      ;; Check channels in priority order
      (let [[val port] (alts! [immediate-ch high-ch normal-ch low-ch idle-ch]
                              :priority true)]
        (when val
          (let [{:keys [task result-ch]} val]
            (try
              (let [result (<! (task))]
                (when result-ch
                  (>! result-ch result)
                  (close! result-ch)))
              (catch js/Error e
                (when result-ch
                  (>! result-ch {:error (.-message e)})
                  (close! result-ch)))))
          (recur))))

    ;; Return scheduling functions
    {:schedule-immediate (fn [task] (put! immediate-ch {:task task}))
     :schedule-high (fn [task] (put! high-ch {:task task}))
     :schedule-normal (fn [task] (put! normal-ch {:task task}))
     :schedule-low (fn [task] (put! low-ch {:task task}))
     :schedule-idle (fn [task] (put! idle-ch {:task task}))}))

(defn priority-demo
  "Demonstrates priority-based scheduling"
  []
  (let [{:keys [schedule-immediate schedule-high schedule-normal
                schedule-low schedule-idle]} (priority-scheduler)]

    ;; Queue tasks in reverse priority order
    (schedule-idle #(go (println "Idle task executed")))
    (schedule-low #(go (println "Low priority task executed")))
    (schedule-normal #(go (println "Normal priority task executed")))
    (schedule-high #(go (println "High priority task executed")))
    (schedule-immediate #(go (println "Immediate task executed")))

    (println "Tasks queued - watch execution order!")))

;; =============================================================================
;; PARALLEL WITH LIMIT: Bounded concurrency
;; =============================================================================

(defn parallel-limit
  "Execute operations in parallel with a concurrency limit.
   Returns a channel that emits all results when complete."
  [operations limit]
  (let [result-ch (chan)
        work-ch (chan limit)
        results (atom [])]

    ;; Start worker pool
    (dotimes [_ limit]
      (go-loop []
        (when-let [{:keys [idx op]} (<! work-ch)]
          (let [result (<! (op))]
            (swap! results assoc idx result))
          (recur))))

    ;; Queue all operations
    (go
      (doseq [[idx op] (map-indexed vector operations)]
        (>! work-ch {:idx idx :op op}))
      (close! work-ch)

      ;; Wait for all to complete
      (<! (timeout 100))  ; Simple wait - production code should track completion
      (>! result-ch @results)
      (close! result-ch))

    result-ch))

(defn parallel-demo
  "Demonstrates bounded parallel execution"
  []
  (let [operations (for [i (range 10)]
                     #(go
                        (<! (timeout (rand-int 500)))
                        (println "Operation" i "complete")
                        (* i 2)))]

    (go
      (println "Starting 10 operations with limit of 3...")
      (let [results (<! (parallel-limit operations 3))]
        (println "All results:" results)))))

;; =============================================================================
;; ASYNC/AWAIT STYLE: Using promise interop
;; =============================================================================

(defn fetch-user
  "Simulates fetching a user - returns a promise"
  [id]
  (js/Promise.
   (fn [resolve _reject]
     (js/setTimeout
      #(resolve {:id id :name (str "User " id)})
      500))))

(defn promise-demo
  "Demonstrates promise interop with core.async"
  []
  (go
    (println "Fetching users with promise interop...")

    ;; Sequential fetches
    (let [user1 (<p! (fetch-user 1))
          user2 (<p! (fetch-user 2))]
      (println "Sequential:" user1 user2))

    ;; Parallel fetches
    (let [p1 (fetch-user 3)
          p2 (fetch-user 4)
          user3 (<p! p1)
          user4 (<p! p2)]
      (println "Parallel:" user3 user4))))

;; =============================================================================
;; COMPARISON: React vs core.async mental models
;; =============================================================================

(comment
  "
  REACT CONCURRENT RENDERING          |  CLOJURESCRIPT CORE.ASYNC
  ====================================|====================================
  Priority Lanes                      |  Priority Channels (alts! :priority)
  - Sync Lane (immediate)             |  - immediate-ch
  - Input Lane (high)                 |  - high-ch
  - Default Lane (normal)             |  - normal-ch
  - Transition Lane (low)             |  - low-ch
  - Idle Lane                         |  - idle-ch

  useTransition                       |  put! to low-priority channel
  - Marks update as non-urgent        |  - Scheduler processes later

  useDeferredValue                    |  debounce channel
  - Defers expensive computation      |  - Waits for quiet period

  Suspense                            |  go block with <! on promise
  - Declarative loading               |  - Blocks until value available

  Time slicing                        |  go blocks + timeout
  - Yield between render chunks       |  - Explicit yields in loops

  Activity (keep alive)               |  Stateful channel processors
  - Preserve state when hidden        |  - State in loop bindings
  ")

;; =============================================================================
;; MAIN: Run demos
;; =============================================================================

(defn ^:export main
  "Run all demos"
  []
  (println "\n=== ClojureScript core.async Concurrency Demos ===\n")

  (println "\n--- Basic Channel Demo ---")
  (basic-channel-demo)

  (js/setTimeout
   (fn []
     (println "\n--- Throttle Demo ---")
     (throttle-demo))
   1000)

  (js/setTimeout
   (fn []
     (println "\n--- Debounce Demo ---")
     (debounce-demo))
   3000)

  (js/setTimeout
   (fn []
     (println "\n--- Sequencer Demo ---")
     (sequencer-demo))
   6000)

  (js/setTimeout
   (fn []
     (println "\n--- Priority Demo ---")
     (priority-demo))
   8000)

  (js/setTimeout
   (fn []
     (println "\n--- Promise Interop Demo ---")
     (promise-demo))
   9000)

  (println "\nDemos scheduled - output will appear over the next 10 seconds"))

;; Auto-run in browser
(when (exists? js/window)
  (set! (.-onload js/window) main))
