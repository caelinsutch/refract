#!/bin/sh
set -eu
mkdir -p native/.build
swiftc -parse-as-library -swift-version 5 -O -target arm64-apple-macosx15.0 -module-cache-path native/.build/module-cache native/Recorder.swift -o native/.build/refract-capture -framework ScreenCaptureKit -framework AVFoundation -framework AppKit
