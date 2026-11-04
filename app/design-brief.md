# Smart Retail AI / Web MVP
Animation mode: non-animated — explicitly requested functional interactive application rather than an animated marketing page. Context is a kiosk, not a scroll-led website.
Product: single-screen horizontal smart refrigerator and HUD demo using the four existing approved product videos and extracted unaltered still frames only.
Spine: a retail command console around a luminous cold chamber. Deep ink #080e29, blue #3277ff, orchid #a850f4, pale ice #dcecff. These brand colors are explicitly approved by user reference; no new rendering of products.
Font: system sans; crisp, small technical telemetry contrasted with oversize commercial photography.
Audience: concept demonstrators, retailers, investors; intuitive to touch or click and truthful about simulated capabilities.
Modes: DEMO (autoplay ad carousel muted), AUDIENCE (presence manual or webcam motion heuristic), SHOPPING (door opens, can selections, basket), SPOTLIGHT (selected product's original video stays active). Audio allowed only after user gesture, max two cycles, second fades to silent; browser restrictions honored. Presence feed stays local and is never uploaded.
HUD: operational store selector, media controls, event feed, analytics and inventory with local browser persistence for this MVP. No production synchronization or actual purchases.
Products: BLOOM / AURA+ / RUSH ZERO / VIVI POP. Original videos and unmodified frames only. Prices and stocks explicitly mock demo values.
Primary flow: start muted carousel -> simulate visitor or grant camera access -> open door -> click video-based product tile -> add to basket -> simulated checkout -> analytic event and local stock decrement.
No face identity recognition, demographic inference, emotion recognition, or minors profiling. Camera merely samples motion, explicit user permission; not precise head pose.
Media asset system: four real uploaded commercials on existing trusted media CDN; unmodified frames extracted from those videos for product thumbnails, not AI generated.
Sections: header with controls; full-bleed video theater; fridge preview and product rack; product detail; analytics mode with metrics, per-product bars, event list, station selector.
Quality: clear permission states, browser/autoplay limitations, SSR safe and responsive horizontal kiosk, no fake live backend labels.
