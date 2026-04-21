// MandalaWebContainerView.swift
// Full-screen WebView loading complete.html from the app bundle.
// Bridges Vision Pro interactions into the web mandala:
//   • Look + pinch (SpatialTapGesture) → window._vpBlink()  → mode.onBlink()
//   • Head orientation (HeadGazeTracker) → window._vpGaze(nx,ny) → mode.onGaze()

import SwiftUI
import WebKit

struct MandalaWebContainerView: View {

    @StateObject private var gazeTracker = HeadGazeTracker()
    @State private var webView: WKWebView? = nil

    var body: some View {
        ZStack {
            // ── Web content ──────────────────────────────────────────────
            MandalaWebView(webViewBinding: $webView)
                .ignoresSafeArea()

            // ── Invisible pinch-gesture overlay ──────────────────────────
            // In visionOS, SpatialTapGesture fires when the user looks at
            // something and pinches — equivalent to a mouse click.
            Color.clear
                .contentShape(Rectangle())
                .simultaneousGesture(
                    SpatialTapGesture()
                        .onEnded { _ in
                            sendBlink()
                        }
                )
        }
        .onAppear {
            gazeTracker.start { nx, ny in
                sendGaze(nx: nx, ny: ny)
            }
        }
        .onDisappear {
            gazeTracker.stop()
        }
    }

    // ─── JS bridges ───────────────────────────────────────────────────────

    private func sendBlink() {
        webView?.evaluateJavaScript(
            "if(typeof window._vpBlink==='function') window._vpBlink();"
        )
    }

    private func sendGaze(nx: Float, ny: Float) {
        webView?.evaluateJavaScript(
            "if(typeof window._vpGaze==='function') window._vpGaze(\(nx),\(ny));"
        )
    }
}

// ─── UIViewRepresentable wrapper ──────────────────────────────────────────

struct MandalaWebView: UIViewRepresentable {

    @Binding var webViewBinding: WKWebView?

    func makeUIView(context: Context) -> WKWebView {
        let cfg = WKWebViewConfiguration()
        cfg.allowsInlineMediaPlayback          = true
        cfg.mediaTypesRequiringUserActionForPlayback = []   // auto-play audio/video

        let wv = WKWebView(frame: .zero, configuration: cfg)
        wv.isOpaque         = false
        wv.backgroundColor  = .black
        wv.scrollView.isScrollEnabled = false

        // Load complete.html from the app bundle
        // All .js files must also be added to the Xcode target
        if let htmlURL = Bundle.main.url(forResource: "complete", withExtension: "html") {
            let dir = htmlURL.deletingLastPathComponent()
            wv.loadFileURL(htmlURL, allowingReadAccessTo: dir)
        } else {
            // Fallback: show an error page
            wv.loadHTMLString(
                "<body style='background:#000;color:#fff;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh'><p>complete.html not found in bundle.<br>Add it to the Xcode project target.</p></body>",
                baseURL: nil
            )
        }

        // Expose the webView reference to the parent view
        DispatchQueue.main.async { webViewBinding = wv }
        return wv
    }

    func updateUIView(_ uiView: WKWebView, context: Context) {}
}
