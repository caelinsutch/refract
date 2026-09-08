import type { Project } from "./project";
export type History = {
  present: Project | null;
  past: Project[];
  future: Project[];
  group?: string;
  stamp: number;
};
export const emptyHistory: History = {
  present: null,
  past: [],
  future: [],
  stamp: 0,
};
export type HistoryAction =
  | { type: "load"; project: Project }
  | { type: "edit"; project: Project; group?: string; now: number }
  | { type: "undo" }
  | { type: "redo" };
export function reduceHistory(state: History, action: HistoryAction): History {
  switch (action.type) {
    case "load":
      return { present: action.project, past: [], future: [], stamp: 0 };
    case "edit": {
      if (state.present === action.project) return state;
      const merge =
        action.group !== undefined &&
        action.group === state.group &&
        action.now >= state.stamp &&
        action.now - state.stamp < 350;
      return {
        present: action.project,
        past:
          state.present && !merge
            ? [...state.past.slice(-99), state.present]
            : state.past,
        future: [],
        group: action.group,
        stamp: action.now,
      };
    }
    case "undo": {
      if (!state.present || !state.past.length) return state;
      return {
        present: state.past[state.past.length - 1],
        past: state.past.slice(0, -1),
        future: [state.present, ...state.future],
        stamp: 0,
      };
    }
    case "redo": {
      if (!state.present || !state.future.length) return state;
      return {
        present: state.future[0],
        past: [...state.past.slice(-99), state.present],
        future: state.future.slice(1),
        stamp: 0,
      };
    }
  }
}
