"use strict";
var L_ScrollerFinal;
(function (L_ScrollerFinal) {
    class MovingFloor extends L_ScrollerFinal.Floor {
        constructor(_speed = L_ScrollerFinal.ƒ.Vector2.X(0.1)) {
            super();
            this.moving = true;
            this.moveableField = L_ScrollerFinal.ƒ.Rectangle.GET(0, 0, 10, 5);
            this.speed = _speed;
        }
        get moveSpeed() {
            return this.speed.copy;
        }
        move() {
            if (this.moveableField.isInside(this.cmpTransform.local.translation.toVector2())) {
                if (this.moveableField.x < this.cmpTransform.local.translation.x &&
                    this.moveableField.y > this.cmpTransform.local.translation.y) {
                    console.log("LEFT Corner");
                    this.speed = this.moveSpeed;
                }
                if (this.moveableField.x + this.moveableField.width <
                    this.cmpTransform.local.translation.x &&
                    this.moveableField.y + this.moveableField.height >
                        this.cmpTransform.local.translation.y) {
                    console.log("Right Corner");
                    this.speed = new L_ScrollerFinal.ƒ.Vector2(-this.moveSpeed.x, -this.moveSpeed.y);
                }
                this.cmpTransform.local.translate(this.moveSpeed.toVector3());
            }
        }
        stop() {
            this.speed = L_ScrollerFinal.ƒ.Vector2.ZERO();
        }
    }
    L_ScrollerFinal.MovingFloor = MovingFloor;
})(L_ScrollerFinal || (L_ScrollerFinal = {}));
//# sourceMappingURL=MovingFloor.js.map