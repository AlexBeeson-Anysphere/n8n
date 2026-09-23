<script setup lang="ts">
import type { TestRunRecord } from '../../evaluation.api';
import MetricsChart from './MetricsChart.vue';
import TestRunsTable from './TestRunsTable.vue';
import RunComparison from '../RunDetail/RunComparison.vue';
import { useI18n } from '@n8n/i18n';
import { useTelemetry } from '@/app/composables/useTelemetry';
import { VIEWS } from '@/app/constants';
import { convertToDisplayDate } from '@/app/utils/formatters/dateFormatter';
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import { N8nButton, N8nText } from '@n8n/design-system';
import { getUserDefinedMetricNames } from '../../evaluation.utils';

type IndexedRun = TestRunRecord & { index: number };

const props = defineProps<{
	runs: IndexedRun[];
	workflowId: string;
}>();

const locale = useI18n();
const router = useRouter();
const telemetry = useTelemetry();

const selectedMetric = defineModel<string>('selectedMetric', { required: true });

const selectedRuns = ref<IndexedRun[]>([]);
const showComparison = ref(false);

const isComparableRun = (row: IndexedRun) => row.status === 'completed' || row.status === 'warning';

const selectableFilter = (row: IndexedRun) => {
	if (!isComparableRun(row)) return false;
	// Cap at two runs: keep already-selected rows checkable so users can deselect.
	if (selectedRuns.value.length >= 2 && !selectedRuns.value.some((run) => run.id === row.id)) {
		return false;
	}
	return true;
};

const selectionHint = computed(() => {
	if (selectedRuns.value.length === 0) {
		return locale.baseText('evaluation.listRuns.compare.selectHint');
	}
	if (selectedRuns.value.length === 1) {
		return locale.baseText('evaluation.listRuns.compare.selectOneMore');
	}
	return locale.baseText('evaluation.listRuns.compare.ready');
});

const canCompare = computed(() => selectedRuns.value.length === 2);

const comparedPair = computed(() => {
	if (!canCompare.value) return null;
	return { runA: selectedRuns.value[0], runB: selectedRuns.value[1] };
});

const metrics = computed(() => {
	const metricKeys = props.runs.reduce((acc, run) => {
		Object.keys(run.metrics ?? {}).forEach((metric) => acc.add(metric));
		return acc;
	}, new Set<string>());
	return [...metricKeys];
});

const metricColumns = computed(() =>
	metrics.value.map((metric) => ({
		prop: `metrics.${metric}`,
		label: metric,
		sortable: true,
		showHeaderTooltip: true,
		sortMethod: (a: TestRunRecord, b: TestRunRecord) =>
			(a.metrics?.[metric] ?? 0) - (b.metrics?.[metric] ?? 0),
		formatter: (row: TestRunRecord) =>
			row.metrics?.[metric] !== undefined ? (row.metrics?.[metric]).toFixed(2) : '',
	})),
);

const columns = computed(() => [
	{
		prop: 'id',
		label: locale.baseText('evaluation.listRuns.runNumber'),
		showOverflowTooltip: true,
	},
	{
		prop: 'runAt',
		label: 'Run at',
		sortable: true,
		showOverflowTooltip: true,
		formatter: (row: TestRunRecord) => {
			const { date, time } = convertToDisplayDate(row.runAt);
			return [date, time].join(', ');
		},
		sortMethod: (a: TestRunRecord, b: TestRunRecord) =>
			new Date(a.runAt ?? a.createdAt).getTime() - new Date(b.runAt ?? b.createdAt).getTime(),
	},
	{
		prop: 'status',
		label: locale.baseText('evaluation.listRuns.status'),
		sortable: true,
	},
	...metricColumns.value,
]);

const handleRowClick = (row: TestRunRecord) => {
	void router.push({
		name: VIEWS.EVALUATION_RUNS_DETAIL,
		params: { runId: row.id },
	});
};

const handleSelectionChange = (rows: IndexedRun[]) => {
	selectedRuns.value = rows.slice(0, 2);
	if (selectedRuns.value.length < 2) {
		showComparison.value = false;
	}
};

const openComparison = () => {
	if (!comparedPair.value) return;
	showComparison.value = true;
	const { runA, runB } = comparedPair.value;
	telemetry.track('User compared evaluation runs', {
		workflow_id: props.workflowId,
		run_id_a: runA.id,
		run_id_b: runB.id,
		metric_count: getUserDefinedMetricNames(runB.metrics).length,
	});
};

const closeComparison = () => {
	showComparison.value = false;
};
</script>

<template>
	<div :class="$style.runs">
		<MetricsChart v-model:selected-metric="selectedMetric" :runs="runs" />

		<div :class="$style.compareBar" data-test-id="run-compare-bar">
			<N8nText size="small" color="text-light">{{ selectionHint }}</N8nText>
			<N8nButton
				variant="outline"
				size="small"
				data-test-id="compare-runs-button"
				:disabled="!canCompare"
				:label="locale.baseText('evaluation.listRuns.compare')"
				@click="openComparison"
			/>
		</div>

		<RunComparison
			v-if="showComparison && comparedPair"
			:run-a="comparedPair.runA"
			:run-b="comparedPair.runB"
			@close="closeComparison"
		/>

		<TestRunsTable
			:class="$style.runsTable"
			:runs
			:columns
			:selectable="true"
			:selectable-filter="selectableFilter"
			data-test-id="past-runs-table"
			@row-click="handleRowClick"
			@selection-change="handleSelectionChange"
		/>
	</div>
</template>

<style module lang="scss">
.runs {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	flex: 1;
	overflow: auto;
	margin-bottom: 20px;
}

.compareBar {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--md);
}
</style>
