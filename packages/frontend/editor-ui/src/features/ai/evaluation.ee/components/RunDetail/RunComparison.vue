<script setup lang="ts">
import type { TestRunRecord } from '../../evaluation.api';
import { useI18n } from '@n8n/i18n';
import { computed } from 'vue';
import { convertToDisplayDate } from '@/app/utils/formatters/dateFormatter';
import { getUserDefinedMetricNames } from '../../evaluation.utils';
import { N8nButton, N8nHeading, N8nText } from '@n8n/design-system';
import MetricSummaryStrip from './MetricSummaryStrip.vue';

type IndexedRun = TestRunRecord & { index: number };

const props = defineProps<{
	runA: IndexedRun;
	runB: IndexedRun;
}>();

const emit = defineEmits<{
	close: [];
}>();

const locale = useI18n();

// Older run is the baseline (previous); newer is the candidate (current),
// matching MetricSummaryStrip / run-detail delta semantics.
const ordered = computed(() => {
	const aTime = new Date(props.runA.runAt ?? props.runA.createdAt).getTime();
	const bTime = new Date(props.runB.runAt ?? props.runB.createdAt).getTime();
	return aTime <= bTime
		? { previous: props.runA, current: props.runB }
		: { previous: props.runB, current: props.runA };
});

const hasMetrics = computed(
	() => getUserDefinedMetricNames(ordered.value.current.metrics).length > 0,
);

const formatRunAt = (run: IndexedRun) => {
	const { date, time } = convertToDisplayDate(run.runAt);
	return [date, time].join(', ');
};
</script>

<template>
	<section :class="$style.comparison" data-test-id="run-comparison">
		<div :class="$style.header">
			<div :class="$style.titleBlock">
				<N8nHeading size="medium" :bold="true" color="text-base">
					{{ locale.baseText('evaluation.runDetail.runComparison.title') }}
				</N8nHeading>
				<div :class="$style.runLabels">
					<N8nText size="small" color="text-light">
						{{
							locale.baseText('evaluation.runDetail.runComparison.baseline', {
								interpolate: { index: String(ordered.previous.index) },
							})
						}}
						· {{ formatRunAt(ordered.previous) }}
					</N8nText>
					<N8nText size="small" color="text-light">
						{{
							locale.baseText('evaluation.runDetail.runComparison.candidate', {
								interpolate: { index: String(ordered.current.index) },
							})
						}}
						· {{ formatRunAt(ordered.current) }}
					</N8nText>
				</div>
			</div>
			<N8nButton
				variant="subtle"
				size="small"
				data-test-id="run-comparison-close"
				:label="locale.baseText('evaluation.runDetail.runComparison.close')"
				@click="emit('close')"
			/>
		</div>

		<MetricSummaryStrip
			v-if="hasMetrics"
			:current-metrics="ordered.current.metrics"
			:previous-metrics="ordered.previous.metrics"
		/>
		<N8nText v-else size="small" color="text-light" data-test-id="run-comparison-empty">
			{{ locale.baseText('evaluation.runDetail.runComparison.noMetrics') }}
		</N8nText>
	</section>
</template>

<style module lang="scss">
.comparison {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	padding: var(--spacing--md);
	border: var(--border-width) var(--border-style) var(--color--foreground);
	border-radius: var(--radius);
	background-color: var(--color--background--light-3);
}

.header {
	display: flex;
	align-items: flex-start;
	justify-content: space-between;
	gap: var(--spacing--md);
}

.titleBlock {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	min-width: 0;
}

.runLabels {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
}
</style>
