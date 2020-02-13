declare namespace L14_ScrollerFoundation {
    import ƒ = FudgeCore;
    class SpriteFrame {
        rectTexture: ƒ.Rectangle;
        pivot: ƒ.Matrix4x4;
        material: ƒ.Material;
        timeScale: number;
    }
    class Sprite {
        private static mesh;
        frames: SpriteFrame[];
        name: string;
        constructor(_name: string);
        static getMesh(): ƒ.MeshSprite;
        /**
         * Creates a series of frames for this [[Sprite]] resulting in pivot matrices and materials to use on a sprite node
         * @param _texture The spritesheet
         * @param _rects A series of rectangles in pixel coordinates defining the single sprites on the sheet
         * @param _resolutionQuad The desired number of pixels within a length of 1 of the sprite quad
         * @param _origin The location of the origin of the sprite quad
         */
        generate(_texture: ƒ.TextureImage, _rects: ƒ.Rectangle[], _resolutionQuad: number, _origin: ƒ.ORIGIN2D): void;
        generateByGrid(_texture: ƒ.TextureImage, _startRect: ƒ.Rectangle, _frames: number, _borderSize: ƒ.Vector2, _resolutionQuad: number, _origin: ƒ.ORIGIN2D): void;
        private createFrame;
    }
    class NodeSprite extends ƒ.Node {
        private cmpMesh;
        private cmpMaterial;
        private sprite;
        private frameCurrent;
        private direction;
        constructor(_name: string, _sprite: Sprite);
        showFrame(_index: number): void;
        showFrameNext(): void;
        setFrameDirection(_direction: number): void;
    }
}
