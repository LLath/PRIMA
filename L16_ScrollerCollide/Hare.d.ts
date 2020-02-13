declare namespace L16_ScrollerCollide {
    import ƒ = FudgeCore;
    enum ACTION {
        IDLE = "Idle",
        WALK = "Walk",
        JUMP = "Jump"
    }
    enum DIRECTION {
        LEFT = 0,
        RIGHT = 1
    }
    class Hare extends ƒ.Node {
        private static sprites;
        private static speedMax;
        private static gravity;
        speed: ƒ.Vector3;
        constructor(_name?: string);
        static generateSprites(_txtImage: ƒ.TextureImage): void;
        show(_action: ACTION): void;
        act(_action: ACTION, _direction?: DIRECTION): void;
        private update;
        private checkCollision;
    }
}
