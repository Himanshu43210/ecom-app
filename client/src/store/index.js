import { configureStore } from "@reduxjs/toolkit";
import assistantReducer from "./slices/assistant-slice";

export default configureStore({
  reducer: {
    assistant: assistantReducer,
  },
});
