import { applyPatch, type Operation, validate } from 'fast-json-patch';
import { orchestrateStatePatchExtraction } from '@/llm/orchestration.js';
import type { ContextBlock, StatePatchExtractionInput } from '@/llm/utils.js';
import { type GlobalState, StateSchema } from '@/schema/state.js';
import { getContent, putContent } from '@/storage/cas.js';

const UNINITIALIZED_VALUE = '<未初始化>';

export function generateInitialState(): GlobalState {
    const initialState: GlobalState = {
        storyMeta: {
            storyline: UNINITIALIZED_VALUE,
            setting: UNINITIALIZED_VALUE,
            metaKnowledge: {}
        },
        world: {
            time: UNINITIALIZED_VALUE,
            weather: UNINITIALIZED_VALUE,
            environment: {}
        },
        characters: {},
        plot_flags: {},
        style: {
            narrativeStyle: UNINITIALIZED_VALUE,
            tone: UNINITIALIZED_VALUE,
            languageStyle: {}
        }
    };
    // 验证初始状态是否符合 schema 定义
    StateSchema.parse(initialState);
    return initialState;
}

export async function updateState(
    currentStateHash: string,
    sceneTextHash: string
): Promise<string> {
    const stateText = await getContent(currentStateHash);
    if (!stateText) {
        throw new Error(`无法获取当前状态数据，hash: ${currentStateHash}`);
    }
    const parseResult = StateSchema.safeParse(JSON.parse(stateText));
    if (!parseResult.success) {
        throw new Error(`当前状态数据不符合 schema 定义: ${parseResult.error.message}`);
    }
    const currentState = parseResult.data;
    const sceneText = await getContent(sceneTextHash);
    if (!sceneText) {
        throw new Error(`无法获取场景文本数据，hash: ${sceneTextHash}`);
    }
    const context: ContextBlock = {
        globalState: currentState,
        coldSettings: [],
        plotPathSummaries: [],
        recentScenes: []
    };

    const input: StatePatchExtractionInput = {
        context,
        sceneText
    };

    const output = (await orchestrateStatePatchExtraction(input)).object;

    const patches = output.patches as Operation[];

    const patchValidation = validate(patches, currentState);

    if (patchValidation) {
        throw patchValidation;
    }

    const newState = applyPatch(currentState, patches, false).newDocument;

    const newStateValidation = StateSchema.safeParse(newState);
    if (!newStateValidation.success) {
        throw new Error(`生成的新状态数据不符合 schema 定义: ${newStateValidation.error.message}`);
    }

    const newHash = await putContent(JSON.stringify(newState));
    return newHash;
}
