import { STORES } from '@n8n/stores';
import { defineStore } from 'pinia';
import { computed, ref, watch } from 'vue';
import get from 'lodash/get';

import {
	type NodeParameterValueType,
	type INode,
	type INodeProperties,
	jsonParse,
} from 'n8n-workflow';
import { useWorkflowsStore } from './workflows.store';
import {
	useWorkflowDocumentStore,
	createWorkflowDocumentId,
} from '@/app/stores/workflowDocument.store';
import { LOCAL_STORAGE_FOCUS_PANEL } from '@/app/constants';
import { useStorage } from '@/app/composables/useStorage';
import { watchOnce } from '@vueuse/core';
import { isFromAIOverrideValue } from '@/features/ndv/parameters/utils/fromAIOverride.utils';
import type { FocusSidebarTabs } from '@/features/setupPanel/types';

// matches NodeCreator to ensure they fully overlap by default when both are open
const DEFAULT_PANEL_WIDTH = 500;

type FocusedNodeParameter = {
	nodeId: string;
	parameter: INodeProperties;
	parameterPath: string;
};

export type RichFocusedNodeParameter = FocusedNodeParameter & {
	node: INode;
	value: NodeParameterValueType;
};

type FocusPanelData = {
	isActive: boolean;
	parameters: FocusedNodeParameter[];
	/** `${nodeId}:${parameterPath}` of the parameter shown in the panel. */
	activeParameterKey?: string;
	width?: number;
};

export function getFocusedParameterKey(nodeId: string, parameterPath: string): string {
	return `${nodeId}:${parameterPath}`;
}

type FocusPanelDataByWid = Record<string, FocusPanelData>;

const DEFAULT_FOCUS_PANEL_DATA: FocusPanelData = { isActive: false, parameters: [] };

export const useFocusPanelStore = defineStore(STORES.FOCUS_PANEL, () => {
	const workflowsStore = useWorkflowsStore();
	const workflowDocumentStore = computed(() =>
		useWorkflowDocumentStore(createWorkflowDocumentId(workflowsStore.workflowId)),
	);
	const focusPanelStorage = useStorage(LOCAL_STORAGE_FOCUS_PANEL);

	const focusPanelData = computed((): FocusPanelDataByWid => {
		const defaultValue: FocusPanelDataByWid = {
			[workflowsStore.workflowId]: DEFAULT_FOCUS_PANEL_DATA,
		};

		return focusPanelStorage.value
			? jsonParse(focusPanelStorage.value, { fallbackValue: defaultValue })
			: defaultValue;
	});

	const currentFocusPanelData = computed(
		(): FocusPanelData =>
			focusPanelData.value[workflowsStore.workflowId] ?? DEFAULT_FOCUS_PANEL_DATA,
	);

	const lastFocusTimestamp = ref(0);
	const selectedTab = ref<FocusSidebarTabs>('setup');

	const focusPanelActive = computed(() => currentFocusPanelData.value.isActive);
	const focusPanelWidth = computed(() => currentFocusPanelData.value.width ?? DEFAULT_PANEL_WIDTH);
	const _focusedNodeParameters = computed(() => currentFocusPanelData.value.parameters);

	// An unenriched parameter indicates a missing nodeId or an otherwise unfocusable parameter
	const focusedNodeParameters = computed<Array<RichFocusedNodeParameter | FocusedNodeParameter>>(
		() =>
			_focusedNodeParameters.value.map((x) => {
				const node = workflowDocumentStore.value.getNodeById(x.nodeId);
				if (!node) return x;

				const value = get(node?.parameters ?? {}, x.parameterPath.replace(/parameters\./, ''));

				// For overridden parameters we pretend they are gone
				// To avoid situations where we show the raw value of a newly overridden, previously focused parameter
				if (typeof value === 'string' && isFromAIOverrideValue(value)) {
					return x;
				}

				return {
					...x,
					node,
					value,
				} satisfies RichFocusedNodeParameter;
			}),
	);

	const activeParameterKey = computed(() => currentFocusPanelData.value.activeParameterKey);

	// Prefer the stored selection. A missing or stale key falls back to the first
	// parameter that still resolves to a node, so older storage keeps working.
	const resolvedParameter = computed(() => {
		const parameters = focusedNodeParameters.value;
		const active = parameters.find(
			(parameter) =>
				getFocusedParameterKey(parameter.nodeId, parameter.parameterPath) ===
					activeParameterKey.value && isRichParameter(parameter),
		);
		if (active && isRichParameter(active)) return active;

		return parameters.find(isRichParameter);
	});

	function _setOptions({
		parameters,
		isActive,
		wid = workflowsStore.workflowId,
		width = undefined,
		removeEmpty = false,
		activeParameterKey: nextActiveParameterKey,
	}: {
		isActive?: boolean;
		parameters?: FocusedNodeParameter[];
		wid?: string;
		width?: number;
		removeEmpty?: boolean;
		/** `null` clears the selection. Omit to keep the key already stored for `wid`. */
		activeParameterKey?: string | null;
	}) {
		const focusPanelDataCurrent = focusPanelData.value;

		// No need to remove empty workflow ID as all workflows now have unique IDs from the start
		if (removeEmpty && '' in focusPanelDataCurrent) {
			delete focusPanelDataCurrent[''];
		}

		const existingForWorkflow = focusPanelData.value[wid];
		const resolvedActiveParameterKey =
			nextActiveParameterKey === null
				? undefined
				: (nextActiveParameterKey ?? existingForWorkflow?.activeParameterKey);

		const nextFocusPanelData: FocusPanelData = {
			isActive: isActive ?? focusPanelActive.value,
			parameters: parameters ?? _focusedNodeParameters.value,
			width: width ?? focusPanelWidth.value,
		};
		if (resolvedActiveParameterKey) {
			nextFocusPanelData.activeParameterKey = resolvedActiveParameterKey;
		}

		focusPanelStorage.value = JSON.stringify({
			...focusPanelData.value,
			[wid]: nextFocusPanelData,
		});

		if (isActive) {
			lastFocusTimestamp.value = Date.now();
		}
	}

	// When a new workflow is saved, we should update the focus panel data with the new workflow ID
	function onNewWorkflowSave(wid: string) {
		// With auto-generated IDs, workflows already have their final ID from the start
		// So this migration is only needed for empty ID case (legacy)
		if (!currentFocusPanelData.value || !('' in focusPanelData.value)) {
			return;
		}

		const latestWorkflowData = focusPanelData.value[''];
		_setOptions({
			wid,
			parameters: latestWorkflowData.parameters,
			isActive: latestWorkflowData.isActive,
			activeParameterKey: latestWorkflowData.activeParameterKey ?? null,
			removeEmpty: true,
		});
	}

	function openWithFocusedNodeParameter(nodeParameter: FocusedNodeParameter) {
		const key = getFocusedParameterKey(nodeParameter.nodeId, nodeParameter.parameterPath);
		const parameters = [
			nodeParameter,
			..._focusedNodeParameters.value.filter(
				(parameter) => getFocusedParameterKey(parameter.nodeId, parameter.parameterPath) !== key,
			),
		];

		_setOptions({ parameters, isActive: true, activeParameterKey: key });
	}

	function openFocusPanel() {
		_setOptions({ isActive: true });
	}

	function closeFocusPanel() {
		_setOptions({ isActive: false });
	}

	function unsetParameters() {
		_setOptions({ parameters: [], activeParameterKey: null });
	}

	function setActiveParameter(key: string) {
		const exists = _focusedNodeParameters.value.some(
			(parameter) => getFocusedParameterKey(parameter.nodeId, parameter.parameterPath) === key,
		);
		if (!exists) return;

		_setOptions({ activeParameterKey: key });
	}

	function removeFocusedNodeParameter(key: string) {
		const remaining = _focusedNodeParameters.value.filter(
			(parameter) => getFocusedParameterKey(parameter.nodeId, parameter.parameterPath) !== key,
		);
		if (remaining.length === _focusedNodeParameters.value.length) return;

		if (remaining.length === 0) {
			unsetParameters();
			return;
		}

		const currentKey = activeParameterKey.value;
		const nextKey =
			currentKey &&
			currentKey !== key &&
			remaining.some(
				(parameter) =>
					getFocusedParameterKey(parameter.nodeId, parameter.parameterPath) === currentKey,
			)
				? currentKey
				: getFocusedParameterKey(remaining[0].nodeId, remaining[0].parameterPath);

		_setOptions({ parameters: remaining, activeParameterKey: nextKey });
	}

	function toggleFocusPanel() {
		_setOptions({ isActive: !focusPanelActive.value });
	}

	function updateWidth(width: number) {
		_setOptions({ width });
	}

	function isRichParameter(
		p: RichFocusedNodeParameter | FocusedNodeParameter,
	): p is RichFocusedNodeParameter {
		return 'value' in p && 'node' in p;
	}

	function setSelectedTab(tab: FocusSidebarTabs) {
		selectedTab.value = tab;
	}

	const focusedNodeParametersInTelemetryFormat = computed<
		Array<{ parameterPath: string; nodeType: string; nodeId: string }>
	>(() =>
		focusedNodeParameters.value.map((x) => ({
			parameterPath: x.parameterPath,
			nodeType: isRichParameter(x) ? x.node.type : 'unresolved',
			nodeId: x.nodeId,
		})),
	);

	// Ensure lastFocusTimestamp is set on initial load if panel is already active (e.g. after reload)
	watchOnce(
		() => currentFocusPanelData.value,
		(value) => {
			if (value.isActive && value.parameters.length > 0) {
				lastFocusTimestamp.value = Date.now();
			}
		},
	);

	// Auto-switch to 'focus' tab when a different parameter is focused.
	// Compare by identity (nodeId + parameterPath) rather than object reference,
	// because _setOptions writes to localStorage causing JSON re-parse on every call
	// (including resize), which creates new object references without actual changes.
	watch(
		() => {
			const p = resolvedParameter.value;
			return p ? `${p.nodeId}:${p.parameterPath}` : null;
		},
		(newKey, oldKey) => {
			if (newKey && newKey !== oldKey) {
				selectedTab.value = 'focus';
			}
		},
	);

	function openFocusPanelForWorkflow(wid: string) {
		_setOptions({ isActive: true, wid });
	}

	return {
		focusPanelActive,
		focusedNodeParameters,
		focusedNodeParametersInTelemetryFormat,
		lastFocusTimestamp,
		focusPanelWidth,
		activeParameterKey,
		resolvedParameter,
		selectedTab,
		openWithFocusedNodeParameter,
		isRichParameter,
		openFocusPanel,
		openFocusPanelForWorkflow,
		closeFocusPanel,
		toggleFocusPanel,
		onNewWorkflowSave,
		updateWidth,
		unsetParameters,
		setActiveParameter,
		removeFocusedNodeParameter,
		setSelectedTab,
	};
});
