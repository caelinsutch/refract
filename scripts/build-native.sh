#!/bin/sh
set -eu
mkdir -p native/.build
swiftc -parse-as-library -swift-version 5 -O -target arm64-apple-macosx15.0 -module-cache-path native/.build/module-cache native/CameraFormat.swift native/CaptureGeometry.swift native/CursorButtons.swift native/KeyboardLabel.swift native/KeyboardCapture.swift native/Recorder.swift -o native/.build/refract-capture -framework ScreenCaptureKit -framework AVFoundation -framework AppKit
swiftc -parse-as-library -swift-version 5 -O -target arm64-apple-macosx15.0 -module-cache-path native/.build/module-cache native/Transcriber.swift -o native/.build/refract-transcribe -framework Speech -framework AVFoundation
