<template>
  <n-space>
    <n-button>Default</n-button>
    <n-button type="tertiary"> Tertiary </n-button>
    <n-button type="primary"> Primary </n-button>
    <n-button type="info" @click="handleClick('info')"> Info </n-button>
    <n-button type="success" @click="handleClick('success')">
      Success
    </n-button>
    <n-button type="warning" @click="handleClick('warning')">
      Warning
    </n-button>
    <n-button type="error" @click="handleClick('error')"> Error </n-button>
  </n-space>
</template>

<script lang="ts" setup>
import { useMessage } from "naive-ui";

const message = useMessage();

const handleClick = (type: "info" | "success" | "warning" | "error") => {
  message[type](
    "If I were you, I will realize that I love you more than any other guy",
  );
};
</script>
