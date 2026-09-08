/// Tracks each mouse button independently, including while capture is paused.
struct CursorButtons {
    private var previous = 0

    mutating func sample(_ buttons: Int, recording: Bool) -> Bool {
        let pressed = buttons & ~previous
        previous = buttons
        return recording && pressed != 0
    }
}
