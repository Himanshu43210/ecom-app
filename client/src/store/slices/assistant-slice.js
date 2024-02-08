import { createSlice } from "@reduxjs/toolkit";

const assistantSlice = createSlice({
  name: "assistant",
  initialState: {
    assistResponses: [],
  },
  reducers: {
    fetchResponse: (state, action) => {
      state.assistResponses.push(action.payload);
    },
  },
});

export const assistantActions = assistantSlice.actions;

export const selectResponses = state => state.assistant.assistResponses;

export default assistantSlice.reducer;