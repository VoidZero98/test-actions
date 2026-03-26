import { createApp } from "vue";
import App from "./App.vue";
import { naive } from "./naive";

createApp(App).use(naive).mount("#app");

// PWA: register service worker after the page loads.
if ("serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("./sw.js")
      .catch(() => {
        // Ignore registration failures (offline/PWA not required).
      });
  });
}
