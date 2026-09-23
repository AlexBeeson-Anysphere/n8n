import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createComponentRenderer } from '@/__tests__/render';
import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';
import { waitFor } from '@testing-library/vue';
import { defineComponent, h } from 'vue';
import { VIEWS } from '@/app/constants';
import RunsSection from './RunsSection.vue';
import type { TestRunRecord } from '../../evaluation.api';

const pushMock = vi.fn();
const trackMock = vi.fn();

vi.mock('vue-router', () => ({
	useRouter: () => ({ push: pushMock }),
	useRoute: () => ({ query: {} }),
	RouterLink: { template: '<a><slot /></a>' },
}));

vi.mock('@/app/composables/useTelemetry', () => ({
	useTelemetry: () => ({ track: trackMock }),
}));

vi.mock('./MetricsChart.vue', () => ({
	default: defineComponent({
		name: 'MetricsChartStub',
		props: { selectedMetric: String, runs: Array },
		emits: ['update:selectedMetric'],
		setup() {
			return () => h('div', { 'data-test-id': 'metrics-chart-stub' });
		},
	}),
}));

vi.mock('./TestRunsTable.vue', () => ({
	default: defineComponent({
		name: 'TestRunsTableStub',
		props: {
			runs: { type: Array, required: true },
			columns: { type: Array, required: true },
			selectable: { type: Boolean, default: false },
			selectableFilter: { type: Function, default: () => true },
		},
		emits: ['rowClick', 'selectionChange'],
		setup(props, { emit, attrs }) {
			return () =>
				h('div', { 'data-test-id': attrs['data-test-id'] ?? 'past-runs-table' }, [
					h(
						'button',
						{
							'data-test-id': 'stub-select-one',
							onClick: () => emit('selectionChange', (props.runs as TestRunRecord[]).slice(0, 1)),
						},
						'select one',
					),
					h(
						'button',
						{
							'data-test-id': 'stub-select-two',
							onClick: () => emit('selectionChange', (props.runs as TestRunRecord[]).slice(0, 2)),
						},
						'select two',
					),
					h(
						'button',
						{
							'data-test-id': 'stub-row-click',
							onClick: () => emit('rowClick', (props.runs as TestRunRecord[])[0]),
						},
						'row click',
					),
				]);
		},
	}),
}));

const renderComponent = createComponentRenderer(RunsSection, {
	props: {
		workflowId: 'workflow-id',
		selectedMetric: 'accuracy',
		runs: [],
	},
});

const completedRuns: Array<TestRunRecord & { index: number }> = [
	{
		id: 'run1',
		workflowId: 'workflow-id',
		status: 'completed',
		runAt: '2023-01-01T10:00:00Z',
		createdAt: '2023-01-01T10:00:00Z',
		updatedAt: '2023-01-01T10:00:00Z',
		completedAt: '2023-01-01T10:00:01Z',
		index: 1,
		metrics: { accuracy: 0.8 },
	},
	{
		id: 'run2',
		workflowId: 'workflow-id',
		status: 'completed',
		runAt: '2023-01-02T10:00:00Z',
		createdAt: '2023-01-02T10:00:00Z',
		updatedAt: '2023-01-02T10:00:00Z',
		completedAt: '2023-01-02T10:00:01Z',
		index: 2,
		metrics: { accuracy: 0.9 },
	},
];

describe('RunsSection', () => {
	beforeEach(() => {
		createTestingPinia();
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	it('keeps Compare disabled until exactly two runs are selected', async () => {
		const { getByTestId } = renderComponent({
			props: { runs: completedRuns },
		});

		expect(getByTestId('compare-runs-button')).toBeDisabled();

		await userEvent.click(getByTestId('stub-select-one'));
		expect(getByTestId('compare-runs-button')).toBeDisabled();

		await userEvent.click(getByTestId('stub-select-two'));
		expect(getByTestId('compare-runs-button')).toBeEnabled();
	});

	it('opens the comparison panel and tracks telemetry when Compare is clicked', async () => {
		const { getByTestId, queryByTestId } = renderComponent({
			props: { runs: completedRuns },
		});

		expect(queryByTestId('run-comparison')).toBeNull();

		await userEvent.click(getByTestId('stub-select-two'));
		await userEvent.click(getByTestId('compare-runs-button'));

		await waitFor(() => expect(getByTestId('run-comparison')).toBeInTheDocument());
		expect(trackMock).toHaveBeenCalledWith('User compared evaluation runs', {
			workflow_id: 'workflow-id',
			run_id_a: 'run1',
			run_id_b: 'run2',
			metric_count: 1,
		});
	});

	it('still navigates to run detail on row click', async () => {
		const { getByTestId } = renderComponent({
			props: { runs: completedRuns },
		});

		await userEvent.click(getByTestId('stub-row-click'));
		expect(pushMock).toHaveBeenCalledWith({
			name: VIEWS.EVALUATION_RUNS_DETAIL,
			params: { runId: 'run1' },
		});
	});
});
