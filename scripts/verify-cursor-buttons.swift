@main struct VerifyCursorButtons {
    static func main() {
        var state = CursorButtons()
        precondition(!state.sample(0, recording: true))
        precondition(state.sample(1, recording: true), "Left down must register")
        precondition(!state.sample(1, recording: true), "Held button must not repeat")
        precondition(state.sample(3, recording: true), "Right down while left is held must register")
        precondition(!state.sample(2, recording: true), "Releasing left must not click")
        precondition(!state.sample(0, recording: false))
        precondition(!state.sample(1, recording: false), "Paused presses must not click")
        precondition(!state.sample(1, recording: true), "Resume must not replay a held button")
        precondition(!state.sample(0, recording: true))
        precondition(state.sample(1, recording: true), "A fresh press after resume must click")
        precondition(state.sample(5, recording: true), "Additional mouse buttons must register")
        print("Cursor button transitions passed")
    }
}
