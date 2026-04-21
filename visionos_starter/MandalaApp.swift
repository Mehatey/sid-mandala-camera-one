// MandalaApp.swift
// visionOS mandala experience — entry point
// New project: Xcode → File → New → Project → visionOS → App
// Drop this file in, replace the generated ones.

import SwiftUI

@main
struct MandalaApp: App {
    var body: some Scene {
        // The "entry" 2D window — just a launch button
        WindowGroup {
            LaunchView()
        }
        .defaultSize(width: 0.5, height: 0.3, depth: 0, in: .meters)

        // The immersive mandala space
        ImmersiveSpace(id: "MandalaSpace") {
            MandalaImmersiveView()
        }
        .immersionStyle(selection: .constant(.mixed), in: .mixed)
    }
}
