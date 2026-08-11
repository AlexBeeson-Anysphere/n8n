import { describe, it, expect, vi } from 'vitest';
import { createComponentRenderer } from '@/__tests__/render';
import { defineComponent, h } from 'vue';
import TestRunsTable from './TestRunsTable.vue';
import type { TestRunRecord } from '../../evaluation.api';

const tableBaseSpy = vi.fn();

vi.mock('../shared/TestTableBase.vue', () => ({
	default: defineComponent({
		name: 'TestTableBaseStub',
		props: {
			data: { type: Array, required: true },
			columns: { type: Array, required: true },
			selectable: { type: Boolean, default: false },
			selectableFilter: { type: Function, default: () => true },
			defaultSort: { type: Object, default: undefined },
		},
		emits: ['rowClick', 'selectionChange'],
		setup(props, { emit, slots }) {
			tableBaseSpy(props);
			return () =>
				h('div', { 'data-test-id': 'test-table-base-stub' }, [
					h(
						'button',
						{
							'data-test-id': 'stub-selection-change',
							onClick: () => emit('selectionChange', props.data),
						},
						'select',
					),
					slots.status?.({
						row: (props.data as Array<TestRunRecord & { index: number }>)[0],
					}),
				]);
		},
	}),
}));

const renderComponent = createComponentRenderer(TestRunsTable);

const runs: Array<TestRunRecord & { index: number }> = [
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
];

describe('TestRunsTable', () => {
	it('forwards selectable props and selectionChange to TestTableBase', async () => {
		const selectableFilter = (row: TestRunRecord & { index: number }) => row.status === 'completed';
		const { getByTestId, emitted } = renderComponent({
			props: {
				runs,
				columns: [{ prop: 'id', label: 'Run' }],
				selectable: true,
				selectableFilter,
			},
		});

		expect(tableBaseSpy).toHaveBeenCalled();
		const lastProps = tableBaseSpy.mock.calls.at(-1)?.[0] as {
			selectable: boolean;
			selectableFilter: (row: TestRunRecord & { index: number }) => boolean;
		};
		expect(lastProps.selectable).toBe(true);
		expect(lastProps.selectableFilter).toBe(selectableFilter);

		await getByTestId('stub-selection-change').click();
		expect(emitted().selectionChange).toHaveLength(1);
		expect(emitted().selectionChange[0]).toEqual([
			expect.arrayContaining([expect.objectContaining({ id: 'run1' })]),
		]);
	});
});
