// HeadGazeTracker.swift
// Uses ARKit WorldTrackingProvider (no special entitlement required) to get
// the Vision Pro's head orientation each frame and converts it to a
// normalised (nx, ny) gaze coordinate in 0..1 space.
//
// This is HEAD orientation, not precise eye gaze. It's still much more
// reliable than a webcam in a dark room. Full eye-level gaze data requires
// Apple's "Main Camera Access" entitlement — apply if you need it post-thesis.

import ARKit
import simd
import Combine

@MainActor
class HeadGazeTracker: ObservableObject {

    // Published so the view can react if needed
    @Published var nx: Float = 0.5
    @Published var ny: Float = 0.5

    private var session         = ARKitSession()
    private var worldTracking   = WorldTrackingProvider()
    private var trackingTask:   Task<Void, Never>?
    private var onGaze:         ((Float, Float) -> Void)?

    // Horizontal & vertical FOV range to map to 0..1
    // ±25° feels natural for mandala interaction
    private let hRange: Float = 25 * .pi / 180
    private let vRange: Float = 20 * .pi / 180

    func start(onGaze: @escaping (Float, Float) -> Void) {
        self.onGaze = onGaze
        trackingTask = Task {
            do {
                try await session.run([worldTracking])
                await runLoop()
            } catch {
                print("HeadGazeTracker: ARKit session failed — \(error)")
            }
        }
    }

    func stop() {
        trackingTask?.cancel()
        trackingTask = nil
        session.stop()
    }

    // ─── Private ─────────────────────────────────────────────────────────

    private func runLoop() async {
        while !Task.isCancelled {
            if let anchor = worldTracking.queryDeviceAnchor(
                atTimestamp: CACurrentMediaTime()
            ) {
                let col2 = anchor.originFromAnchorTransform.columns.2
                // Device forward = -Z axis in local space
                let forward = SIMD3<Float>(-col2.x, -col2.y, -col2.z)

                // Horizontal angle: left/right
                let hAngle = atan2(forward.x, -forward.z)   // –π … +π
                // Vertical angle: up/down
                let vAngle = asin(max(-1, min(1, -forward.y))) // –π/2 … +π/2

                // Map to 0..1 within the defined FOV range
                let rawNx = (hAngle / hRange) * 0.5 + 0.5
                let rawNy = (vAngle / vRange) * 0.5 + 0.5

                let clampedNx = max(0, min(1, rawNx))
                let clampedNy = max(0, min(1, rawNy))

                await MainActor.run { [clampedNx, clampedNy] in
                    self.nx = clampedNx
                    self.ny = clampedNy
                    self.onGaze?(clampedNx, clampedNy)
                }
            }

            // ~60 Hz polling
            try? await Task.sleep(nanoseconds: 16_666_666)
        }
    }
}
