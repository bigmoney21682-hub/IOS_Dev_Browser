// FILE: Extensions.swift
// PATH: ios/Shared/
// DESC: Utility extensions for future UIKit/SwiftUI bridging

import Foundation
import SwiftUI

extension String {
    var trimmed: String {
        self.trimmingCharacters(in: .whitespacesAndNewlines)
    }
}
