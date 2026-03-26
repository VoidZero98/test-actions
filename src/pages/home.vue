<template>
  <div class="home-container">
    <n-data-table
      :rowKey="(row: Song) => row.no"
      :columns="columns"
      :data="data"
      :single-line="false"
      :pagination="false"
      striped
      bordered
    />
  </div>
</template>

<script lang="ts" setup>
import { columns } from "./type";
import type { Song } from "./type";

const data: Song[] = [
  { no: 3, title: "Wonderwall", length: "4:18" },
  { no: 4, title: "Don't Look Back in Anger", length: "4:48" },
  { no: 12, title: "Champagne Supernova", length: "7:27" },
];
</script>

<style scoped>
.home-container {
  padding: 20px;
  box-sizing: border-box;
}

/* 偶数行背景色（不影响表头） */
:deep(.n-data-table-tbody .n-data-table-tr:nth-child(even) .n-data-table-td) {
  background-color: rgba(0, 0, 0, 0.04);
}
</style>
