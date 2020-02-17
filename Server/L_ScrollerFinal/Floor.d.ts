declare namespace L_ScrollerFinal {
    import ƒ = FudgeCore;
    class Floor extends ƒ.Node {
        private static mesh;
        private static readonly pivot;
        constructor(_name?: string, _color?: string);
        getRectWorld(): ƒ.Rectangle;
        private createMaterial;
    }
}
