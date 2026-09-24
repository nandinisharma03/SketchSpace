# SketchSpace - Stage 1 (Real-time core)

## Run
```bash
npm install
npm start
```
Open http://localhost:3000 in TWO browser windows. Use the same `?room=` link in both, then draw.

## What works
- Rooms via URL (?room=abc123)
- Live drawing sync (Socket.io)
- Live cursors with names
- Undo (your own last stroke), clear, eraser, brush size/color
- Online users list
- New joiners get the existing drawing
