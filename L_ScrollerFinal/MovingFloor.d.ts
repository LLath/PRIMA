declare namespace L_ScrollerFinal {
    class MovingFloor extends Floor {
        readonly moving: boolean;
        private speed;
        private moveableField;
        constructor(_speed?: ƒ.Vector2);
        readonly moveSpeed: ƒ.Vector2;
        move(): void;
        stop(): void;
    }
}
