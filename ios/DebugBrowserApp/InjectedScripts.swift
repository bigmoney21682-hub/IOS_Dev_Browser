// FILE: InjectedScripts.swift
// PATH: ios/DebugBrowserApp/
// DESC: Loads JS from GitHub Pages with local fallback

import Foundation
import WebKit

struct InjectedScripts {

    static let remoteBase = "https://bigmoney21682-hub.github.io/IOS_Dev_Browser/web-inject/"

    static let scriptNames = [
        "bridge",
        "console",
        "network",
        "hud"
    ]

    static func loadAll(into controller: WKUserContentController) {
        for name in scriptNames {
            loadScript(named: name, into: controller)
        }
    }

    private static func loadScript(named name: String,
                                   into controller: WKUserContentController) {

        // 1. Attempt remote load
        if let remoteURL = URL(string: "\(remoteBase)\(name).js"),
           let remoteSource = try? String(contentsOf: remoteURL) {

            print("[INJECT] Loaded remote script:", name)
            inject(source: remoteSource, into: controller)
            return
        }

        // 2. Fallback to local bundle
        if let path = Bundle.main.path(forResource: name, ofType: "js"),
           let localSource = try? String(contentsOfFile: path) {

            print("[INJECT] Loaded local script:", name)
            inject(source: localSource, into: controller)
            return
        }

        print("[INJECT] ERROR: Missing script:", name)
    }

    private static func inject(source: String,
                               into controller: WKUserContentController) {

        let script = WKUserScript(
            source: source,
            injectionTime: .atDocumentStart,
            forMainFrameOnly: false
        )

        controller.addUserScript(script)
    }
}
