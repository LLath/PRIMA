namespace L_ScrollerFinal {
  export interface ObjectLiteral {
    [key: string]: any;
  }
  export interface KeyPressed {
    [code: string]: boolean;
  }
  export interface Keybindings {
    [left: string]: ƒ.KEYBOARD_CODE;
    right: ƒ.KEYBOARD_CODE;
    jump: ƒ.KEYBOARD_CODE;
  }
  export interface Stats {
    [speed: string]: number;
    jump: number;
  }
}
