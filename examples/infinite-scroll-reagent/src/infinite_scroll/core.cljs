(ns infinite-scroll.core
  "Infinite Scroll with Deferred Loading - Reagent/re-frame
   React Paris Meetup #011

   Demonstrates:
   - Throttled scroll handling with core.async
   - Debounced filtering
   - Virtual rendering for large lists
   - Effect-based data fetching"
  (:require [reagent.core :as r]
            [reagent.dom :as rdom]
            [re-frame.core :as rf]
            [cljs.core.async :refer [chan go go-loop <! >! put! timeout
                                      sliding-buffer close!]]))

;; =============================================================================
;; CONFIG
;; =============================================================================

(def page-size 50)
(def item-height 100)
(def container-height 600)
(def overscan 5)

;; =============================================================================
;; MOCK DATA & API
;; =============================================================================

(def categories ["Technology" "Science" "Art" "Music" "Sports"])

(defn generate-item [id]
  {:id id
   :title (str "Item " id)
   :description (str "This is a detailed description for item " id
                     ". It contains enough text to simulate real content.")
   :image-url (str "https://picsum.photos/seed/" id "/100/100")
   :category (nth categories (mod id (count categories)))
   :timestamp (- (.now js/Date) (* id 60000))})

(defn generate-items [start-id count]
  (mapv generate-item (range start-id (+ start-id count))))

;; Simulate API fetch with delay
(defn fetch-items! [page callback]
  (js/setTimeout
   (fn []
     (let [items (generate-items (* page page-size) page-size)]
       (callback items)))
   (+ 500 (rand-int 500))))

;; =============================================================================
;; RE-FRAME: DB SCHEMA
;; =============================================================================

(def default-db
  {:items []
   :page 0
   :loading? false
   :has-more? true
   :filter-text ""
   :scroll-top 0
   :is-scrolling? false})

;; =============================================================================
;; RE-FRAME: EVENTS
;; =============================================================================

(rf/reg-event-db
 :initialize-db
 (fn [_ _]
   default-db))

(rf/reg-event-fx
 :load-more
 (fn [{:keys [db]} _]
   (if (or (:loading? db) (not (:has-more? db)))
     {}
     {:db (assoc db :loading? true)
      :fetch-items {:page (:page db)}})))

(rf/reg-event-db
 :items-loaded
 (fn [db [_ new-items]]
   (-> db
       (update :items into new-items)
       (update :page inc)
       (assoc :loading? false)
       (assoc :has-more? (= (count new-items) page-size)))))

(rf/reg-event-db
 :set-filter
 (fn [db [_ text]]
   (assoc db :filter-text text)))

(rf/reg-event-db
 :set-scroll-top
 (fn [db [_ scroll-top]]
   (assoc db :scroll-top scroll-top)))

(rf/reg-event-db
 :set-scrolling
 (fn [db [_ is-scrolling?]]
   (assoc db :is-scrolling? is-scrolling?)))

;; =============================================================================
;; RE-FRAME: EFFECTS
;; =============================================================================

(rf/reg-fx
 :fetch-items
 (fn [{:keys [page]}]
   (fetch-items! page #(rf/dispatch [:items-loaded %]))))

;; =============================================================================
;; RE-FRAME: SUBSCRIPTIONS
;; =============================================================================

(rf/reg-sub
 :items
 (fn [db _]
   (:items db)))

(rf/reg-sub
 :filter-text
 (fn [db _]
   (:filter-text db)))

(rf/reg-sub
 :loading?
 (fn [db _]
   (:loading? db)))

(rf/reg-sub
 :has-more?
 (fn [db _]
   (:has-more? db)))

(rf/reg-sub
 :scroll-top
 (fn [db _]
   (:scroll-top db)))

(rf/reg-sub
 :is-scrolling?
 (fn [db _]
   (:is-scrolling? db)))

;; Derived: filtered items
(rf/reg-sub
 :filtered-items
 :<- [:items]
 :<- [:filter-text]
 (fn [[items filter-text] _]
   (if (empty? filter-text)
     items
     (let [lower-filter (clojure.string/lower-case filter-text)]
       (filterv
        (fn [item]
          (or (clojure.string/includes?
               (clojure.string/lower-case (:title item)) lower-filter)
              (clojure.string/includes?
               (clojure.string/lower-case (:description item)) lower-filter)
              (clojure.string/includes?
               (clojure.string/lower-case (:category item)) lower-filter)))
        items)))))

;; Derived: visible items (virtualized)
(rf/reg-sub
 :visible-items
 :<- [:filtered-items]
 :<- [:scroll-top]
 (fn [[items scroll-top] _]
   (let [start-idx (max 0 (- (quot scroll-top item-height) overscan))
         visible-count (quot container-height item-height)
         end-idx (min (count items) (+ start-idx visible-count (* 2 overscan)))
         offset-y (* start-idx item-height)]
     {:items (subvec items start-idx (min end-idx (count items)))
      :start-index start-idx
      :offset-y offset-y
      :total-height (* (count items) item-height)})))

(rf/reg-sub
 :item-count
 :<- [:items]
 (fn [items _]
   (count items)))

(rf/reg-sub
 :filtered-count
 :<- [:filtered-items]
 (fn [items _]
   (count items)))

;; =============================================================================
;; SCROLL HANDLING WITH CORE.ASYNC
;; =============================================================================

(defonce scroll-ch (chan (sliding-buffer 1)))
(defonce scroll-stop-ch (chan (sliding-buffer 1)))

(defn start-scroll-processor! []
  ;; Process scroll events with throttling
  (go-loop []
    (let [scroll-top (<! scroll-ch)]
      (rf/dispatch [:set-scroll-top scroll-top])
      (rf/dispatch [:set-scrolling true])

      ;; Check if near bottom for infinite scroll
      (let [items-count @(rf/subscribe [:filtered-count])
            total-height (* items-count item-height)
            visible-bottom (+ scroll-top container-height)]
        (when (> visible-bottom (- total-height 200))
          (rf/dispatch [:load-more])))

      ;; Wait a bit before processing next scroll
      (<! (timeout 16))  ; ~60fps
      (recur)))

  ;; Detect scroll stop for UI feedback
  (go-loop []
    (<! scroll-stop-ch)
    (<! (timeout 150))  ; Wait for scroll to settle
    (rf/dispatch [:set-scrolling false])
    (recur)))

(defn handle-scroll [e]
  (let [scroll-top (.-scrollTop (.-target e))]
    (put! scroll-ch scroll-top)
    (put! scroll-stop-ch true)))

;; =============================================================================
;; DEBOUNCED FILTER
;; =============================================================================

(defonce filter-ch (chan (sliding-buffer 1)))

(defn start-filter-processor! []
  (go-loop [last-value nil]
    (let [[value _] (alts! [filter-ch (timeout 300)] :priority true)]
      (if value
        (recur value)  ; New value, restart timer
        (do
          (when last-value
            (rf/dispatch [:set-filter last-value]))
          (recur nil))))))

(defn handle-filter-change [e]
  (put! filter-ch (.-value (.-target e))))

;; =============================================================================
;; COMPONENTS
;; =============================================================================

(defn item-placeholder
  "Simplified item shown during fast scrolling"
  []
  [:div {:style {:height item-height
                 :display "flex"
                 :align-items "center"
                 :padding "8px 16px"
                 :border-bottom "1px solid #eee"
                 :background "#fafafa"}}
   [:div {:style {:width 60
                  :height 60
                  :background "#ddd"
                  :border-radius 4
                  :margin-right 16}}]
   [:div {:style {:flex 1}}
    [:div {:style {:height 16 :background "#ddd" :width "60%" :margin-bottom 8}}]
    [:div {:style {:height 12 :background "#eee" :width "80%"}}]]])

(defn item-row
  "Full item display"
  [{:keys [id title description image-url category timestamp]}]
  [:div {:style {:height item-height
                 :display "flex"
                 :align-items "center"
                 :padding "8px 16px"
                 :border-bottom "1px solid #eee"
                 :background "white"}}
   [:img {:src image-url
          :alt title
          :loading "lazy"
          :style {:width 60
                  :height 60
                  :border-radius 4
                  :margin-right 16
                  :object-fit "cover"}}]
   [:div {:style {:flex 1 :min-width 0}}
    [:div {:style {:font-weight "bold"
                   :margin-bottom 4
                   :white-space "nowrap"
                   :overflow "hidden"
                   :text-overflow "ellipsis"}}
     title]
    [:div {:style {:font-size 14
                   :color "#666"
                   :white-space "nowrap"
                   :overflow "hidden"
                   :text-overflow "ellipsis"}}
     description]
    [:div {:style {:font-size 12 :color "#999" :margin-top 4}}
     category " - " (.toLocaleTimeString (js/Date. timestamp))]]])

(defn virtualized-list
  "Renders only visible items for performance"
  []
  (let [{:keys [items offset-y total-height]} @(rf/subscribe [:visible-items])
        is-scrolling? @(rf/subscribe [:is-scrolling?])]
    [:div {:on-scroll handle-scroll
           :style {:height container-height
                   :overflow "auto"
                   :position "relative"}}
     ;; Total height spacer
     [:div {:style {:height total-height :position "relative"}}
      ;; Visible items
      [:div {:style {:position "absolute"
                     :top offset-y
                     :left 0
                     :right 0
                     :opacity (if is-scrolling? 0.7 1)
                     :transition "opacity 0.1s"}}
       (for [item items]
         ^{:key (:id item)}
         (if is-scrolling?
           [item-placeholder]
           [item-row item]))]]

     ;; Scrolling indicator
     (when is-scrolling?
       [:div {:style {:position "absolute"
                      :top 10
                      :right 10
                      :background "rgba(0,0,0,0.7)"
                      :color "white"
                      :padding "4px 8px"
                      :border-radius 4
                      :font-size 12}}
        "Scrolling..."])]))

(defn loading-indicator []
  [:div {:style {:padding 20 :text-align "center" :color "#666"}}
   [:div {:style {:width 24
                  :height 24
                  :border "3px solid #eee"
                  :border-top-color "#333"
                  :border-radius "50%"
                  :animation "spin 1s linear infinite"
                  :margin "0 auto 8px"}}]
   "Loading more items..."])

(defn filter-input []
  (let [item-count @(rf/subscribe [:item-count])
        filtered-count @(rf/subscribe [:filtered-count])]
    [:div {:style {:padding 16 :border-bottom "1px solid #eee"}}
     [:input {:type "text"
              :placeholder "Filter items..."
              :on-change handle-filter-change
              :style {:width "100%"
                      :padding "12px 16px"
                      :font-size 16
                      :border "1px solid #ddd"
                      :border-radius 8
                      :box-sizing "border-box"}}]
     [:div {:style {:margin-top 8 :font-size 14 :color "#666"}}
      (str "Showing " filtered-count " of " item-count " items")]]))

(defn header []
  (let [item-count @(rf/subscribe [:item-count])]
    [:div {:style {:padding 16
                   :border-bottom "1px solid #eee"
                   :display "flex"
                   :justify-content "space-between"
                   :align-items "center"}}
     [:h2 {:style {:margin 0}} "Infinite Scroll Demo"]
     [:span {:style {:color "#666" :font-size 14}}
      (str item-count " items loaded")]]))

(defn infinite-scroll-app []
  (let [loading? @(rf/subscribe [:loading?])
        has-more? @(rf/subscribe [:has-more?])]
    [:div {:style {:max-width 600 :margin "0 auto" :font-family "system-ui"}}
     [header]
     [filter-input]
     [virtualized-list]
     (when loading? [loading-indicator])
     (when-not has-more?
       [:div {:style {:padding 20 :text-align "center" :color "#999"}}
        "No more items to load"])

     ;; Global styles
     [:style
      "@keyframes spin { to { transform: rotate(360deg); } }"]]))

;; =============================================================================
;; INITIALIZATION
;; =============================================================================

(defn ^:export init []
  (rf/dispatch-sync [:initialize-db])
  (start-scroll-processor!)
  (start-filter-processor!)
  (rf/dispatch [:load-more])
  (rdom/render [infinite-scroll-app]
               (.getElementById js/document "app")))

(defn ^:dev/after-load reload []
  (rdom/render [infinite-scroll-app]
               (.getElementById js/document "app")))
