"use strict";
var L_ScrollerFinal;
(function (L_ScrollerFinal) {
    var ƒ = FudgeCore;
    class Floor extends ƒ.Node {
        constructor(_name = "Floor") {
            super(_name);
            this.addComponent(new ƒ.ComponentTransform());
            this.addComponent(new ƒ.ComponentMaterial(Floor.material));
            let cmpMesh = new ƒ.ComponentMesh(Floor.mesh);
            cmpMesh.pivot = Floor.pivot;
            this.addComponent(cmpMesh);
        }
        getRectWorld() {
            let rect = ƒ.Rectangle.GET(0, 0, 100, 100);
            let topleft = new ƒ.Vector3(-0.5, 0.5, 0);
            let bottomright = new ƒ.Vector3(0.5, -0.5, 0);
            //let pivot: ƒ.Matrix4x4 = this.getComponent(ƒ.ComponentMesh).pivot;
            let mtxResult = ƒ.Matrix4x4.MULTIPLICATION(this.mtxWorld, Floor.pivot);
            topleft.transform(mtxResult, true);
            bottomright.transform(mtxResult, true);
            let size = new ƒ.Vector2(bottomright.x - topleft.x, bottomright.y - topleft.y);
            rect.position = topleft.toVector2();
            rect.size = size;
            return rect;
        }
    }
    Floor.mesh = new ƒ.MeshSprite();
    Floor.material = new ƒ.Material("Floor", ƒ.ShaderUniColor, new ƒ.CoatColored(ƒ.Color.CSS("red", 0.5)));
    Floor.pivot = ƒ.Matrix4x4.TRANSLATION(ƒ.Vector3.Y(0));
    L_ScrollerFinal.Floor = Floor;
})(L_ScrollerFinal || (L_ScrollerFinal = {}));
//# sourceMappingURL=Floor.js.map