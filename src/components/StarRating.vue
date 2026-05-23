<script setup lang="ts">
const props = defineProps<{
  modelValue: number | undefined
  readonly?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: number]
}>()

const stars = [1, 2, 3, 4, 5]

function setRating(value: number) {
  if (props.readonly) return
  emit('update:modelValue', value)
}
</script>

<template>
  <div class="star-rating" :class="{ readonly }">
    <button
      v-for="star in stars"
      :key="star"
      class="star-btn"
      :class="{ active: modelValue && star <= modelValue }"
      @click="setRating(star)"
      :disabled="readonly"
      type="button"
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"
          fill="currentColor"
        />
      </svg>
    </button>
  </div>
</template>

<style scoped>
.star-rating {
  display: flex;
  gap: 2px;
}

.star-btn {
  padding: 2px;
  background: transparent;
  border: none;
  cursor: pointer;
  color: var(--text-muted);
  transition: all 0.15s ease;
}

.star-btn:hover:not(:disabled) {
  transform: scale(1.1);
}

.star-btn.active {
  color: #f59e0b;
}

.star-rating.readonly .star-btn {
  cursor: default;
}
</style>
