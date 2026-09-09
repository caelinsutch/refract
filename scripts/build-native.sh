#!/bin/sh
set -eu
mkdir -p native/.build
swiftc -parse-as-library -swift-version 5 -O -target arm64-apple-macosx15.0 -module-cache-path native/.build/module-cache native/DesktopContent.swift native/CameraFormat.swift native/CaptureGeometry.swift native/CursorButtons.swift native/KeyboardLabel.swift native/KeyboardCapture.swift native/Recorder.swift -o native/.build/refract-capture -framework ScreenCaptureKit -framework AVFoundation -framework AppKit
swiftc -parse-as-library -swift-version 5 -O -target arm64-apple-macosx15.0 -module-cache-path native/.build/module-cache native/Transcriber.swift -o native/.build/refract-transcribe -framework Speech -framework AVFoundation
swiftc -emit-library -swift-version 5 -O -target arm64-apple-macosx15.0 -module-cache-path native/.build/module-cache -import-objc-header native/NodeBridge.h native/RecorderGlass.swift native/RecorderSymbols.swift -o native/.build/recorder-glass.node -framework AppKit -Xlinker -undefined -Xlinker dynamic_lookup
