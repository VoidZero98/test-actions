<template>
  <div class="home-container">
    <n-card title="Todo List" class="todo-card">
      <n-space vertical>
        <n-space>
          <n-input
            v-model:value="newTodoText"
            placeholder="输入待办，例如：学习 Naive UI"
            clearable
            @keydown.enter="addTodo"
          />
          <n-button type="primary" @click="addTodo">添加</n-button>
        </n-space>

        <n-divider />

        <n-space>
          <n-button
            size="small"
            :type="filter === 'all' ? 'primary' : 'tertiary'"
            @click="filter = 'all'"
          >
            全部（{{ totalCount }}）
          </n-button>
          <n-button
            size="small"
            :type="filter === 'active' ? 'primary' : 'tertiary'"
            @click="filter = 'active'"
          >
            未完成（{{ activeCount }}）
          </n-button>
          <n-button
            size="small"
            :type="filter === 'done' ? 'primary' : 'tertiary'"
            @click="filter = 'done'"
          >
            已完成（{{ doneCount }}）
          </n-button>
          <n-button
            size="small"
            type="error"
            quaternary
            :disabled="doneCount === 0"
            @click="clearCompleted"
          >
            清空已完成
          </n-button>
        </n-space>

        <div v-if="filteredTodos.length === 0" class="todo-empty">
          <n-empty description="暂无待办" />
        </div>

        <div v-else class="todo-list">
          <div
            v-for="todo in filteredTodos"
            :key="todo.id"
            class="todo-item"
          >
            <n-checkbox
              :checked="todo.done"
              @update:checked="(val: boolean) => toggleTodo(todo.id, val)"
            >
              <span :class="{ 'todo-text': true, done: todo.done }">
                {{ todo.text }}
              </span>
            </n-checkbox>

            <n-button
              size="small"
              type="error"
              quaternary
              @click="deleteTodo(todo.id)"
            >
              删除
            </n-button>
          </div>
        </div>
      </n-space>
    </n-card>
  </div>
</template>

<script lang="ts" setup>
import { computed, ref, watch } from "vue";

type Filter = "all" | "active" | "done";

interface Todo {
  id: number;
  text: string;
  done: boolean;
  createdAt: number;
}

const STORAGE_KEY = "naive-demo:todos";

const newTodoText = ref("");
const filter = ref<Filter>("all");

const loadTodos = (): Todo[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Todo[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const todos = ref<Todo[]>(loadTodos());

watch(
  todos,
  (value) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
    } catch {
      // ignore quota errors etc.
    }
  },
  { deep: true }
);

const totalCount = computed(() => todos.value.length);
const activeCount = computed(() => todos.value.filter((t) => !t.done).length);
const doneCount = computed(() => todos.value.filter((t) => t.done).length);

const filteredTodos = computed(() => {
  switch (filter.value) {
    case "active":
      return todos.value.filter((t) => !t.done);
    case "done":
      return todos.value.filter((t) => t.done);
    case "all":
    default:
      return todos.value;
  }
});

const addTodo = () => {
  const text = newTodoText.value.trim();
  if (!text) return;

  const now = Date.now();
  todos.value = [
    {
      id: now + Math.floor(Math.random() * 1000),
      text,
      done: false,
      createdAt: now,
    },
    ...todos.value,
  ];

  newTodoText.value = "";
};

const toggleTodo = (id: number, checked: boolean) => {
  todos.value = todos.value.map((t) =>
    t.id === id ? { ...t, done: checked } : t
  );
};

const deleteTodo = (id: number) => {
  todos.value = todos.value.filter((t) => t.id !== id);
};

const clearCompleted = () => {
  todos.value = todos.value.filter((t) => !t.done);
  if (filter.value === "done") filter.value = "all";
};
</script>

<style scoped>
.home-container {
  padding: 20px;
  box-sizing: border-box;
}

.todo-card {
  max-width: 900px;
  margin: 0 auto;
}

.todo-empty {
  padding: 12px 0;
  display: flex;
  justify-content: center;
}

.todo-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.todo-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid rgba(0, 0, 0, 0.06);
}

.todo-text {
  display: inline-block;
}

.todo-text.done,
.done {
  text-decoration: line-through;
  color: rgba(0, 0, 0, 0.45);
}
</style>
