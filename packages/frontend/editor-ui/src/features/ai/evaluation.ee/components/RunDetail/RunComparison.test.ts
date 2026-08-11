import { describe, it, expect } from 'vitest';
import { createComponentRenderer } from '@/__tests__/render';
import userEvent from '@testing-library/user-event';
import RunComparison from './RunComparison.vue';
import type { TestRunRecord } from '../../evaluation.api';

const renderComponent = createComponentRenderer(RunComparison);

const olderRun: TestRunRecord & { index: number } = {
	id: 'run-a',
	workflowId: 'workflow-id',
	status: 'completed',
	runAt: '2023-01-01T10:00:00Z',
	createdAt: '2023-01-01T10:00:00Z',
	updatedAt: '2023-01-01T10:00:00Z',
	completedAt: '2023-01-01T10:00:01Z',
	index: 1,
	metrics: {
		accuracy: 0.8,
	},
};

const newerRun: TestRunRecord & { index: number } = {
	id: 'run-b',
	workflowId: 'workflow-id',
	status: 'completed',
	runAt: '2023-01-02T10:00:00Z',
	createdAt: '2023-01-02T10:00:00Z',
	updatedAt: '2023-01-02T10:00:00Z',
	completedAt: '2023-01-02T10:00:01Z',
	index: 2,
	metrics: {
		accuracy: 0.9,
	},
};

describe('RunComparison', () => {
	it('renders metric summary deltas using the newer run as current', () => {
		const { getByTestId, getAllByTestId } = renderComponent({
			props: { runA: olderRun, runB: newerRun },
		});

		expect(getByTestId('run-comparison')).toBeInTheDocument();
		expect(getByTestId('metric-summary-strip')).toBeInTheDocument();
		expect(getAllByTestId('metric-summary-card').length).toBeGreaterThan(0);
		expect(getByTestId('run-comparison').textContent).toContain('Baseline');
		expect(getByTestId('run-comparison').textContent).toContain('Candidate');
	});

	it('orders by runAt even when props are passed newest-first', () => {
		const { getByTestId } = renderComponent({
			props: { runA: newerRun, runB: olderRun },
		});

		const text = getByTestId('run-comparison').textContent ?? '';
		const baselineIdx = text.indexOf('Baseline');
		const candidateIdx = text.indexOf('Candidate');
		expect(baselineIdx).toBeGreaterThan(-1);
		expect(candidateIdx).toBeGreaterThan(baselineIdx);
		expect(text).toContain('Run #1');
		expect(text).toContain('Run #2');
	});

	it('shows an empty state when neither run has user metrics', () => {
		const { getByTestId, queryByTestId } = renderComponent({
			props: {
				runA: { ...olderRun, metrics: {} },
				runB: { ...newerRun, metrics: {} },
			},
		});

		expect(getByTestId('run-comparison-empty')).toBeInTheDocument();
		expect(queryByTestId('metric-summary-strip')).toBeNull();
	});

	it('emits close when the close button is clicked', async () => {
		const { getByTestId, emitted } = renderComponent({
			props: { runA: olderRun, runB: newerRun },
		});

		await userEvent.click(getByTestId('run-comparison-close'));
		expect(emitted().close).toHaveLength(1);
	});
});
