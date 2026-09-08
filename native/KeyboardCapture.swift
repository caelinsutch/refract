import AppKit
import CoreGraphics
import Foundation

/// A passive event tap, alive only for the current recording session.
final class KeyboardCapture: @unchecked Sendable {
    private let receive: @Sendable ([String: Any], Double) -> Void
    private let lock = NSLock()
    private var loop: CFRunLoop?
    private var stopped = false
    private var tap: CFMachPort?
    init(receive: @escaping @Sendable ([String: Any], Double) -> Void) { self.receive = receive }

    func start() -> String {
        guard CGPreflightListenEventAccess() else { return "permission-required" }
        let context = Unmanaged.passUnretained(self).toOpaque()
        guard let port = CGEvent.tapCreate(tap: .cgSessionEventTap, place: .tailAppendEventTap, options: .listenOnly,
            eventsOfInterest: CGEventMask(1) << CGEventType.keyDown.rawValue,
            callback: { _, type, event, context in
                guard let context else { return Unmanaged.passUnretained(event) }
                let owner = Unmanaged<KeyboardCapture>.fromOpaque(context).takeUnretainedValue()
                if type == .tapDisabledByTimeout || type == .tapDisabledByUserInput {
                    owner.lock.lock()
                    if !owner.stopped, let tap = owner.tap { CGEvent.tapEnable(tap: tap, enable: true) }
                    owner.lock.unlock()
                } else if type == .keyDown { owner.keyDown(event) }
                return Unmanaged.passUnretained(event)
            }, userInfo: context) else { return "unavailable" }
        tap = port
        Thread.detachNewThread { [self] in
            let current = CFRunLoopGetCurrent()!
            let source = CFMachPortCreateRunLoopSource(nil, port, 0)!
            lock.lock()
            if stopped { lock.unlock(); CFMachPortInvalidate(port); return }
            loop = current
            CFRunLoopAddSource(current, source, .commonModes)
            lock.unlock()
            CFRunLoopRun()
            CFMachPortInvalidate(port)
            CFRunLoopRemoveSource(current, source, .commonModes)
            lock.lock(); loop = nil; tap = nil; lock.unlock()
        }
        return "available"
    }
    func stop() {
        lock.lock(); stopped = true
        if let tap { CGEvent.tapEnable(tap: tap, enable: false) }
        if let loop { CFRunLoopPerformBlock(loop, CFRunLoopMode.commonModes.rawValue) { CFRunLoopStop(loop) }; CFRunLoopWakeUp(loop) }
        lock.unlock()
    }
    private func keyDown(_ event: CGEvent) {
        guard let key = NSEvent(cgEvent: event) else { return }
        guard let label = keyboardLabel(keyCode: key.keyCode, characters: key.charactersIgnoringModifiers) else { return }
        var modifiers: [String] = []
        for (flag, name) in [(NSEvent.ModifierFlags.control,"control"),(.option,"option"),(.shift,"shift"),(.command,"command")] {
            if key.modifierFlags.contains(flag) { modifiers.append(name) }
        }
        receive(["key":label,"modifiers":modifiers,"repeat":key.isARepeat], Double(event.timestamp) / 1_000_000_000)
    }
}
