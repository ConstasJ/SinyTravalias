import { type GlobalState, StateSchema } from '@/schema/state.js';

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
