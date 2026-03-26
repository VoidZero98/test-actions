<template>
  <n-config-provider :theme="lightTheme" :theme-overrides="themeOverrides">
    <n-message-provider>
      <Home />
    </n-message-provider>
  </n-config-provider>
</template>

<script lang="ts" setup>
import { NConfigProvider, NMessageProvider, lightTheme } from "naive-ui";
import Home from "./pages/home.vue";

const themeOverrides = {
  common: {
    primaryColor: "#fd1f6d",
  },
  Button: {
    textColor: "#FF0000",
  },
  // ...
};
</script>
