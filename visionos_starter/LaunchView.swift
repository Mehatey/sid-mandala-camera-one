// LaunchView.swift
// Entry window — tap to open the immersive mandala space.

import SwiftUI

struct LaunchView: View {
    @Environment(\.openImmersiveSpace) var openImmersiveSpace
    @Environment(\.dismissImmersiveSpace) var dismissImmersiveSpace
    @State private var isImmersive = false

    var body: some View {
        VStack(spacing: 20) {
            Text("mandala")
                .font(.system(size: 32, weight: .thin, design: .serif))
                .foregroundStyle(.white)

            Button(isImmersive ? "exit" : "enter") {
                Task {
                    if isImmersive {
                        await dismissImmersiveSpace()
                    } else {
                        await openImmersiveSpace(id: "MandalaSpace")
                    }
                    isImmersive.toggle()
                }
            }
            .buttonStyle(.borderedProminent)
            .tint(isImmersive ? .red.opacity(0.6) : .white.opacity(0.15))
        }
        .padding(40)
        .glassBackgroundEffect()
    }
}
