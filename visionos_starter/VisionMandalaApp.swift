// VisionMandalaApp.swift
// visionOS app that loads complete.html in a WebView and bridges:
//   - pinch gesture  → onBlink()
//   - head orientation → onGaze(nx, ny)
//
// SETUP:
//   1. New Xcode project → visionOS → App
//   2. Replace all generated Swift files with these 3 files
//   3. Drag complete.html + all .js files into Xcode project
//      (make sure "Copy items if needed" + target membership are checked)
//   4. In complete.html add the JS bridge snippet (see visionJSBridge.js comments)
//   5. Build & run on Vision Pro or Simulator

import SwiftUI
import RealityKit

@main
struct VisionMandalaApp: App {

    init() {
        // Register the rotation system used by the mandala entity (if needed)
        // RotationSystem.registerSystem()
    }

    var body: some Scene {
        WindowGroup {
            MandalaWebContainerView()
        }
        // Large window — close to a screen-filling panel in visionOS
        .defaultSize(width: 1.4, height: 1.0, depth: 0, in: .meters)
    }
}
