import { createApp } from "vue";
import App from "./App.vue";
import { naive } from "./naive";

createApp(App).use(naive).mount("#app");
