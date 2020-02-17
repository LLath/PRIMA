declare namespace L_ScrollerFinal {
    export import ƒ = FudgeCore;
    enum GAMESTATE {
        START = "Start",
        INGAME = "Ingame",
        OPTIONS = "Options",
        RESTART = "Restart",
        CLOSE = "Close",
        KEYBINDINGS = "Keybindings"
    }
    let keybinding: Keybindings;
    let state: GAMESTATE;
}
