// FILE: ContentView.swift
// PATH: ios/DebugBrowserApp/
// DESC: Root UI with URL bar + BrowserView

import SwiftUI

struct ContentView: View {
    @State private var urlText: String = ""
    @State private var currentURL: URL? = nil

    var body: some View {
        VStack(spacing: 0) {
            HStack {
                TextField("Enter URL", text: $urlText)
                    .textFieldStyle(.roundedBorder)
                    .autocorrectionDisabled()
                    .textInputAutocapitalization(.never)

                Button("Go") {
                    if let url = URL(string: urlText) {
                        currentURL = url
                    }
                }
                .buttonStyle(.borderedProminent)
            }
            .padding()
            .background(Color(.systemGray6))

            BrowserView(url: currentURL)
                .edgesIgnoringSafeArea(.bottom)
        }
    }
}
