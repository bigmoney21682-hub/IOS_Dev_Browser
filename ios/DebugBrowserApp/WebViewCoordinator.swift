// FILE: WebViewCoordinator.swift
// PATH: ios/DebugBrowserApp/
// DESC: Handles navigation + JS bridge messages

import Foundation
import WebKit

class WebViewCoordinator: NSObject, WKNavigationDelegate, WKScriptMessageHandler {

    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        print("[IOS_DEV_BROWSER] Page loaded:", webView.url?.absoluteString ?? "unknown")
    }

    // JS → Native bridge
    func userContentController(_ userContentController: WKUserContentController,
                               didReceive message: WKScriptMessage) {
        print("[BRIDGE] JS Message:", message.name, message.body)
    }
}
