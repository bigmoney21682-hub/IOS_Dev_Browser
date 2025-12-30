// FILE: BrowserView.swift
// PATH: ios/DebugBrowserApp/
// DESC: SwiftUI wrapper around WKWebView with injection pipeline

import SwiftUI
import WebKit

struct BrowserView: UIViewRepresentable {
    let url: URL?

    func makeCoordinator() -> WebViewCoordinator {
        WebViewCoordinator()
    }

    func makeUIView(context: Context) -> WKWebView {
        let config = WKWebViewConfiguration()
        config.userContentController = WKUserContentController()

        // Inject JS/CSS on every page load
        InjectedScripts.loadAll(into: config.userContentController)

        let webView = WKWebView(frame: .zero, configuration: config)
        webView.navigationDelegate = context.coordinator
        webView.allowsBackForwardNavigationGestures = true
        webView.scrollView.bounces = true

        return webView
    }

    func updateUIView(_ webView: WKWebView, context: Context) {
        if let url = url {
            webView.load(URLRequest(url: url))
        }
    }
}
