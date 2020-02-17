"use strict";
var L_ScrollerFinal;
(function (L_ScrollerFinal) {
    class Camera extends L_ScrollerFinal.ƒ.ComponentCamera {
        constructor() {
            super();
            this.levelBeginning = new L_ScrollerFinal.ƒ.Vector2(7, 4);
            this.levelEnd = new L_ScrollerFinal.ƒ.Vector2(20, 6);
            this.pivot.translateZ(15);
            this.pivot.lookAt(L_ScrollerFinal.ƒ.Vector3.ZERO());
            this.pivot.translateX(7);
            this.pivot.translateY(4);
        }
        translateBasedOn(_object) {
            if (_object.mtxWorld.translation.x > this.levelBeginning.x) {
                this.pivot.translateX(_object.mtxWorld.translation.x - this.pivot.translation.x);
            }
            if (_object.mtxWorld.translation.y > this.levelBeginning.y &&
                _object.mtxWorld.translation.y < this.levelEnd.y) {
                this.pivot.translateY(_object.mtxWorld.translation.y - this.pivot.translation.y);
            }
        }
    }
    L_ScrollerFinal.Camera = Camera;
})(L_ScrollerFinal || (L_ScrollerFinal = {}));
//# sourceMappingURL=Camera.js.map