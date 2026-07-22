# Chat refactor

The chat page now uses separated feature components:

- `src/components/chat/ChatHeader.jsx` — partner header and visible audio/video call buttons
- `src/components/chat/CallScreen.jsx` — audio/video call preview interface
- `src/components/chat/VoiceMessage.jsx` — voice-message playback
- `src/components/chat/TypingIndicator.jsx` — partner typing display
- `src/components/chat/ImageViewer.jsx` — fullscreen image viewer

`src/pages/Chat.jsx` keeps the shared chat state and Supabase operations, and calls these components.

The call buttons currently open a UI preview. WebRTC and Supabase call signaling still need to be connected before two devices can communicate.
