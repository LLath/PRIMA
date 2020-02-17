declare namespace L_ScrollerFinal {
    interface ObjectLiteral {
        [key: string]: any;
    }
    interface KeyPressed {
        [code: string]: boolean;
    }
    interface Keybindings {
        [left: string]: ƒ.KEYBOARD_CODE;
        right: ƒ.KEYBOARD_CODE;
        jump: ƒ.KEYBOARD_CODE;
    }
    interface Stats {
        [speed: string]: number;
        jump: number;
    }
}
