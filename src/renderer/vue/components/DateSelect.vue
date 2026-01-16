<template>
    <div class="date-select" :class="{ disabled }">
        <SelectField
            v-model="yearValue"
            class="date-select__field"
            :options="yearOptions"
            placeholder="年"
            :disabled="disabled"
            autoScroll
        />
        <SelectField
            v-model="monthValue"
            class="date-select__field"
            :options="monthOptions"
            placeholder="月"
            :disabled="disabled"
            autoScroll
        />
        <SelectField
            v-model="dayValue"
            class="date-select__field"
            :options="dayOptions"
            placeholder="日"
            :disabled="disabled"
            autoScroll
        />
    </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue';
import SelectField from './SelectField.vue';

const props = defineProps({
    modelValue: {
        type: String,
        default: ''
    },
    disabled: {
        type: Boolean,
        default: false
    },
    minYear: {
        type: Number,
        default: null
    },
    maxYear: {
        type: Number,
        default: null
    }
});

const emit = defineEmits(['update:modelValue']);

const today = new Date();
const minYear = computed(() => props.minYear ?? today.getFullYear() - 100);
const maxYear = computed(() => props.maxYear ?? today.getFullYear());

const parseDate = (value) => {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value || '');
    if (!match) return { year: null, month: null, day: null };
    return {
        year: Number(match[1]),
        month: Number(match[2]),
        day: Number(match[3])
    };
};

const yearValue = ref(null);
const monthValue = ref(null);
const dayValue = ref(null);

const yearOptions = computed(() => {
    const options = [];
    for (let y = maxYear.value; y >= minYear.value; y -= 1) {
        options.push(y);
    }
    return options;
});

const monthOptions = computed(() =>
    Array.from({ length: 12 }, (_, index) => index + 1)
);

const daysInMonth = (year, month) =>
    new Date(year, month, 0).getDate();

const dayOptions = computed(() => {
    if (!yearValue.value || !monthValue.value) return [];
    const count = daysInMonth(yearValue.value, monthValue.value);
    return Array.from({ length: count }, (_, index) => index + 1);
});

const syncFromModel = (value) => {
    const parsed = parseDate(value);
    yearValue.value = parsed.year;
    monthValue.value = parsed.month;
    dayValue.value = parsed.day;
};

const syncToModel = () => {
    if (!yearValue.value || !monthValue.value || !dayValue.value) {
        emit('update:modelValue', '');
        return;
    }
    const y = String(yearValue.value).padStart(4, '0');
    const m = String(monthValue.value).padStart(2, '0');
    const d = String(dayValue.value).padStart(2, '0');
    emit('update:modelValue', `${y}-${m}-${d}`);
};

watch(
    () => props.modelValue,
    (value) => {
        syncFromModel(value);
    },
    { immediate: true }
);

watch([yearValue, monthValue], () => {
    if (!yearValue.value || !monthValue.value) return;
    const maxDay = daysInMonth(yearValue.value, monthValue.value);
    if (dayValue.value && dayValue.value > maxDay) {
        dayValue.value = maxDay;
    }
});

watch([yearValue, monthValue, dayValue], () => {
    syncToModel();
});
</script>

<style scoped>
.date-select {
    display: grid;
    grid-template-columns: 1.2fr 1fr 1fr;
    gap: 10px;
}

.date-select.disabled {
    opacity: 0.5;
    pointer-events: none;
}

.date-select__field {
    width: 100%;
}
</style>
