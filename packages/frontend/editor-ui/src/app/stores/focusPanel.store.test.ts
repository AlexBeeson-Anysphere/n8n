import { createTestNode, mockNodeTypeDescription } from '@/__tests__/mocks';
import { LOCAL_STORAGE_FOCUS_PANEL, SET_NODE_TYPE } from '@/app/constants';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import {
	createWorkflowDocumentId,
	useWorkflowDocumentStore,
} from '@/app/stores/workflowDocument.store';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { createPinia, setActivePinia } from 'pinia';
import type { INodeProperties } from 'n8n-workflow';
import { nextTick } from 'vue';
import { getFocusedParameterKey, useFocusPanelStore } from './focusPanel.store';

const parameterA: INodeProperties = {
	displayName: 'A',
	name: 'a',
	type: 'string',
	default: '',
};
const parameterB: INodeProperties = {
	displayName: 'B',
	name: 'b',
	type: 'string',
	default: '',
};

type StoredFocusPanel = {
	isActive: boolean;
	parameters: Array<{ nodeId: string; parameterPath: string }>;
	activeParameterKey?: string;
};

function readStoredFocusPanel(): Record<string, StoredFocusPanel> {
	const raw = localStorage.getItem(LOCAL_STORAGE_FOCUS_PANEL);
	if (!raw) throw new Error('focus panel storage is empty');

	const parsed: unknown = JSON.parse(raw);
	const stored = typeof parsed === 'string' ? JSON.parse(parsed) : parsed;
	return stored as Record<string, StoredFocusPanel>;
}

function writeStoredFocusPanel(data: Record<string, StoredFocusPanel>) {
	const raw = localStorage.getItem(LOCAL_STORAGE_FOCUS_PANEL);
	const parsed: unknown = raw ? JSON.parse(raw) : null;
	// vueuse's any-serializer writes JSON.stringify(string), so match that shape when present.
	const encoded =
		typeof parsed === 'string' ? JSON.stringify(JSON.stringify(data)) : JSON.stringify(data);
	localStorage.setItem(LOCAL_STORAGE_FOCUS_PANEL, encoded);
}

describe('focusPanel.store', () => {
	function boot() {
		const pinia = setActivePinia(createPinia());
		const nodeTypesStore = useNodeTypesStore(pinia);
		nodeTypesStore.setNodeTypes([
			mockNodeTypeDescription({
				name: SET_NODE_TYPE,
				properties: [parameterA, parameterB],
			}),
		]);

		const workflowsStore = useWorkflowsStore(pinia);
		workflowsStore.setWorkflowId('w0');

		const workflowDocumentStore = useWorkflowDocumentStore(createWorkflowDocumentId('w0'));
		workflowDocumentStore.setNodes([
			createTestNode({
				id: 'n0',
				name: 'N0',
				parameters: { a: 'va', b: 'vb' },
				type: SET_NODE_TYPE,
			}),
			createTestNode({
				id: 'n1',
				name: 'N1',
				parameters: { a: 'other' },
				type: SET_NODE_TYPE,
			}),
		]);

		return useFocusPanelStore(pinia);
	}

	beforeEach(() => {
		localStorage.clear();
	});

	it('should keep focused parameters newest-first and activate the one just opened', () => {
		const store = boot();

		store.openWithFocusedNodeParameter({
			nodeId: 'n0',
			parameter: parameterA,
			parameterPath: 'parameters.a',
		});
		store.openWithFocusedNodeParameter({
			nodeId: 'n0',
			parameter: parameterB,
			parameterPath: 'parameters.b',
		});

		expect(store.focusedNodeParameters.map((parameter) => parameter.parameterPath)).toEqual([
			'parameters.b',
			'parameters.a',
		]);
		expect(store.activeParameterKey).toBe(getFocusedParameterKey('n0', 'parameters.b'));
		expect(store.resolvedParameter?.parameterPath).toBe('parameters.b');
	});

	it('should dedupe a parameter when it is focused again and make it active', () => {
		const store = boot();

		store.openWithFocusedNodeParameter({
			nodeId: 'n0',
			parameter: parameterA,
			parameterPath: 'parameters.a',
		});
		store.openWithFocusedNodeParameter({
			nodeId: 'n0',
			parameter: parameterB,
			parameterPath: 'parameters.b',
		});
		store.openWithFocusedNodeParameter({
			nodeId: 'n0',
			parameter: parameterA,
			parameterPath: 'parameters.a',
		});

		expect(store.focusedNodeParameters.map((parameter) => parameter.parameterPath)).toEqual([
			'parameters.a',
			'parameters.b',
		]);
		expect(store.activeParameterKey).toBe(getFocusedParameterKey('n0', 'parameters.a'));
	});

	it('should keep the same parameter path when it belongs to another node', () => {
		const store = boot();

		store.openWithFocusedNodeParameter({
			nodeId: 'n0',
			parameter: parameterA,
			parameterPath: 'parameters.a',
		});
		store.openWithFocusedNodeParameter({
			nodeId: 'n1',
			parameter: parameterA,
			parameterPath: 'parameters.a',
		});

		expect(
			store.focusedNodeParameters.map((parameter) =>
				getFocusedParameterKey(parameter.nodeId, parameter.parameterPath),
			),
		).toEqual([
			getFocusedParameterKey('n1', 'parameters.a'),
			getFocusedParameterKey('n0', 'parameters.a'),
		]);
	});

	it('should activate the next parameter when the active one is removed', () => {
		const store = boot();

		store.openWithFocusedNodeParameter({
			nodeId: 'n0',
			parameter: parameterA,
			parameterPath: 'parameters.a',
		});
		store.openWithFocusedNodeParameter({
			nodeId: 'n0',
			parameter: parameterB,
			parameterPath: 'parameters.b',
		});

		store.removeFocusedNodeParameter(getFocusedParameterKey('n0', 'parameters.b'));

		expect(store.focusedNodeParameters.map((parameter) => parameter.parameterPath)).toEqual([
			'parameters.a',
		]);
		expect(store.activeParameterKey).toBe(getFocusedParameterKey('n0', 'parameters.a'));
		expect(store.focusPanelActive).toBe(true);
	});

	it('should clear parameters without closing the panel when the last parameter is removed', () => {
		const store = boot();

		store.openWithFocusedNodeParameter({
			nodeId: 'n0',
			parameter: parameterA,
			parameterPath: 'parameters.a',
		});
		store.removeFocusedNodeParameter(getFocusedParameterKey('n0', 'parameters.a'));

		expect(store.focusedNodeParameters).toEqual([]);
		expect(store.activeParameterKey).toBeUndefined();
		expect(store.focusPanelActive).toBe(true);
	});

	it('should restore parameters and the active parameter from storage', async () => {
		const store = boot();

		store.openWithFocusedNodeParameter({
			nodeId: 'n0',
			parameter: parameterA,
			parameterPath: 'parameters.a',
		});
		store.openWithFocusedNodeParameter({
			nodeId: 'n0',
			parameter: parameterB,
			parameterPath: 'parameters.b',
		});
		await nextTick();

		const reloaded = boot();

		expect(reloaded.focusedNodeParameters.map((parameter) => parameter.parameterPath)).toEqual([
			'parameters.b',
			'parameters.a',
		]);
		expect(reloaded.activeParameterKey).toBe(getFocusedParameterKey('n0', 'parameters.b'));
		expect(reloaded.resolvedParameter?.parameterPath).toBe('parameters.b');
	});

	it('should fall back to the first parameter when the stored active key is missing', async () => {
		const store = boot();

		store.openWithFocusedNodeParameter({
			nodeId: 'n0',
			parameter: parameterA,
			parameterPath: 'parameters.a',
		});
		store.openWithFocusedNodeParameter({
			nodeId: 'n0',
			parameter: parameterB,
			parameterPath: 'parameters.b',
		});
		await nextTick();

		const stored = readStoredFocusPanel();
		delete stored.w0.activeParameterKey;
		writeStoredFocusPanel(stored);

		const reloaded = boot();

		expect(reloaded.activeParameterKey).toBeUndefined();
		expect(reloaded.resolvedParameter?.parameterPath).toBe('parameters.b');
	});
});
