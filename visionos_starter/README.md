# visionOS Mandala Starter

## For tomorrow (thesis review)

**Don't build the app tonight.** Use this instead:

1. Open complete.html in **Safari on visionOS** → runs natively in the browser, full canvas
2. Put Safari in full-screen mode (pinch the window corner → expand)
3. AirPlay from Vision Pro → Apple TV / HDMI adapter → projector
4. Room sees your view. You're inside the experience.

That IS the piece. The audience watches the projection. You're inside the surveillance.

---

## After the review — build the proper app

### Setup

1. Xcode 15+ with visionOS SDK installed
2. New project → visionOS → App template
3. Replace generated files with the 3 Swift files in this folder
4. In `MandalaApp.swift`, **before** the `@main` App struct, add:
   ```swift
   import RealityKit
   // In your App init:
   RotationSystem.registerSystem()
   RotationComponent.registerComponent()
   ```

### What it does

| Phase | Duration | What happens |
|-------|----------|-------------|
| Meditation | 90s (configurable) | 3-ring gold mandala, slow rotation, hover effects |
| Interrupt | 20s | Distraction panels spawn, mandala spins chaotically |
| Return | — | Panels vanish, rotation calms, cycle repeats |

### Eye tracking (requires Apple entitlement)

The app uses `HoverEffectComponent` (no entitlement needed — responds to gaze/pointer).

Full eye-gaze data (`ARKitSession` with `HandTrackingProvider` or upcoming `GazeAnchor`)
requires applying to Apple at:
https://developer.apple.com/contact/request/spatial-computing-support

For the thesis concept, HoverEffects are enough to demonstrate responsiveness.

### 3D mandala models (Blender → USDZ)

1. In Blender: create mandala using Array modifier + rotation
2. File → Export → USDA
3. Run: `xcrun usdz_converter mandala.usda mandala.usdz`
4. Drag into Xcode project
5. Load with:
   ```swift
   let model = try! await Entity(named: "mandala")
   content.add(model)
   ```

### Connecting to the web projection

Bridge Vision Pro gaze data to complete.html via WebSocket:
- Vision Pro app sends `{x, y}` gaze coordinates over local WiFi WebSocket
- complete.html WebSocket client receives them, calls `onGaze(nx, ny)` on current mode
- Same WiFi network required

This makes the wall projection respond to the Vision Pro wearer's gaze in real time.
The room watches the mandala move. The wearer doesn't know the room is watching.
That's the piece.
