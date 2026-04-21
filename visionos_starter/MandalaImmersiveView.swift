// MandalaImmersiveView.swift
// The actual spatial mandala.
// Procedurally generates a 3-ring mandala from spheres + torus segments.
// Phase 1 (MEDITATION): slow rotation, warm gold/amber colours, calm.
// Phase 2 (INTERRUPT): triggered after interruptDelay seconds — chaos erupts.
//   Distraction panels appear, colours go harsh, mandala fragment spins.
// Phase 3 (RETURN): after 20s the mandala reforms.
//
// No special entitlements needed. Uses hover effects for basic gaze response.
// Full eye-tracking (ARKitSession GazeAnchor) requires entitlement from Apple
// — apply at: developer.apple.com/contact/request/spatial-computing-support

import SwiftUI
import RealityKit

// ─── Phase ───────────────────────────────────────────────────────────────────

enum MandalaPhase { case meditation, interrupt, returning }

// ─── Main view ───────────────────────────────────────────────────────────────

struct MandalaImmersiveView: View {
    @State private var phase: MandalaPhase = .meditation
    @State private var root = Entity()
    @State private var timer: Timer?

    // Duration of pure meditation before the interrupt (seconds)
    let interruptDelay: Double = 90

    var body: some View {
        RealityView { content in
            buildMandala(in: root)
            root.position = SIMD3(0, 1.5, -1.2)   // eye level, 1.2 m in front
            content.add(root)
        } update: { content in
            // Phase changes drive visual updates via the timer below
        }
        .onAppear {
            scheduleInterrupt()
        }
        .onDisappear {
            timer?.invalidate()
        }
    }

    // ─── Build mandala geometry ───────────────────────────────────────────

    func buildMandala(in parent: Entity) {
        parent.children.removeAll()

        let rings: [(count: Int, radius: Float, sphereR: Float, hue: Float)] = [
            (count: 8,  radius: 0.06, sphereR: 0.010, hue: 0.12),   // inner — warm gold
            (count: 12, radius: 0.14, sphereR: 0.008, hue: 0.08),   // mid — amber
            (count: 24, radius: 0.25, sphereR: 0.006, hue: 0.05),   // outer — deep orange
        ]

        for ring in rings {
            let ringEntity = Entity()
            for i in 0..<ring.count {
                let angle = Float(i) * (2 * .pi / Float(ring.count))
                let x = ring.radius * cos(angle)
                let y = ring.radius * sin(angle)

                let sphere = ModelEntity(
                    mesh: .generateSphere(radius: ring.sphereR),
                    materials: [goldMaterial(hue: ring.hue)]
                )
                sphere.position = SIMD3(x, y, 0)

                // Hover effect: sphere brightens when gaze/pointer is near
                sphere.components.set(HoverEffectComponent())
                ringEntity.addChild(sphere)
            }
            // Each ring gets its own slow rotation component
            let spinComp = RotationComponent(
                axis: SIMD3(0, 0, 1),
                speed: Float.random(in: 0.04...0.10) * (i % 2 == 0 ? 1 : -1)
            )
            ringEntity.components.set(spinComp)
            parent.addChild(ringEntity)
        }

        // Centre accent
        let centre = ModelEntity(
            mesh: .generateSphere(radius: 0.018),
            materials: [SimpleMaterial(color: .init(white: 1, alpha: 0.9), isMetallic: true)]
        )
        centre.components.set(HoverEffectComponent())
        parent.addChild(centre)
    }

    // ─── Distraction elements (interrupt phase) ───────────────────────────

    func spawnDistractions(in parent: Entity) {
        // A few harsh flat planes around the mandala simulating notification panels
        let positions: [SIMD3<Float>] = [
            SIMD3(-0.35, 0.12, 0.05),
            SIMD3(0.38, -0.10, 0.05),
            SIMD3(0.05, 0.35, 0.08),
        ]
        let colors: [UIColor] = [.systemRed, .systemBlue, .systemYellow]

        for (pos, color) in zip(positions, colors) {
            let panel = ModelEntity(
                mesh: .generatePlane(width: 0.12, height: 0.08),
                materials: [SimpleMaterial(color: color.withAlphaComponent(0.85), isMetallic: false)]
            )
            panel.position = pos
            panel.name = "distraction"
            parent.addChild(panel)
        }
    }

    func removeDistractions(from parent: Entity) {
        for child in parent.children where child.name == "distraction" {
            child.removeFromParent()
        }
    }

    // ─── Phase timing ─────────────────────────────────────────────────────

    func scheduleInterrupt() {
        timer = Timer.scheduledTimer(withTimeInterval: interruptDelay, repeats: false) { _ in
            enterInterrupt()
        }
    }

    func enterInterrupt() {
        phase = .interrupt
        spawnDistractions(in: root)
        // Speed up mandala rotation
        for child in root.children {
            if var spin = child.components[RotationComponent.self] {
                spin.speed *= 5
                child.components.set(spin)
            }
        }
        // Return to meditation after 20s
        DispatchQueue.main.asyncAfter(deadline: .now() + 20) {
            enterReturn()
        }
    }

    func enterReturn() {
        phase = .returning
        removeDistractions(from: root)
        // Slow rotation back down
        for child in root.children {
            if var spin = child.components[RotationComponent.self] {
                spin.speed /= 5
                child.components.set(spin)
            }
        }
        phase = .meditation
        scheduleInterrupt()   // cycle repeats
    }

    // ─── Material helpers ──────────────────────────────────────────────────

    func goldMaterial(hue: Float) -> SimpleMaterial {
        let uiColor = UIColor(hue: CGFloat(hue), saturation: 0.75, brightness: 0.95, alpha: 1)
        return SimpleMaterial(color: uiColor, isMetallic: true)
    }
}

// ─── Custom RotationComponent ─────────────────────────────────────────────

// A simple component that spins an entity each frame.
// In a real app use AnimationResource or a System, but this keeps it self-contained.
struct RotationComponent: Component {
    var axis: SIMD3<Float> = SIMD3(0, 0, 1)
    var speed: Float = 0.05  // radians per second
}

// NOTE: To make RotationComponent actually animate, you need a RealityKit System.
// Add this to your app (register in App init):
//   RotationSystem.registerSystem()
//   RotationComponent.registerComponent()

class RotationSystem: System {
    static let query = EntityQuery(where: .has(RotationComponent.self))

    required init(scene: RealityKit.Scene) {}

    func update(context: SceneUpdateContext) {
        let dt = Float(context.deltaTime)
        for entity in context.entities(matching: Self.query, updatingSystemWhen: .rendering) {
            let comp = entity.components[RotationComponent.self]!
            let angle = comp.speed * dt
            let rot   = simd_quatf(angle: angle, axis: comp.axis)
            entity.transform.rotation = rot * entity.transform.rotation
        }
    }
}
