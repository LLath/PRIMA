"use strict";
// / <reference path="../L14_ScrollerFoundation/SpriteGenerator.ts"/>
var L_ScrollerFinal;
// / <reference path="../L14_ScrollerFoundation/SpriteGenerator.ts"/>
(function (L_ScrollerFinal) {
    var ƒ = FudgeCore;
    let ACTION;
    (function (ACTION) {
        ACTION["IDLE"] = "Idle";
        ACTION["WALK"] = "Walk";
        ACTION["JUMP"] = "Jump";
    })(ACTION = L_ScrollerFinal.ACTION || (L_ScrollerFinal.ACTION = {}));
    let DIRECTION;
    (function (DIRECTION) {
        DIRECTION[DIRECTION["LEFT"] = 0] = "LEFT";
        DIRECTION[DIRECTION["RIGHT"] = 1] = "RIGHT";
    })(DIRECTION = L_ScrollerFinal.DIRECTION || (L_ScrollerFinal.DIRECTION = {}));
    class Hare extends ƒ.Node {
        constructor(_name = "Hare") {
            super(_name);
            this.speed = ƒ.Vector3.ZERO();
            this.update = (_event) => {
                this.broadcastEvent(new CustomEvent("showNext"));
                let timeFrame = ƒ.Loop.timeFrameGame / 1000;
                this.speed.y += Hare.gravity.y * timeFrame;
                let distance = ƒ.Vector3.SCALE(this.speed, timeFrame);
                this.cmpTransform.local.translate(distance);
                this.checkCollision();
            };
            this.addComponent(new ƒ.ComponentTransform());
            for (let sprite of Hare.sprites) {
                let nodeSprite = new L_ScrollerFinal.NodeSprite(sprite.name, sprite);
                nodeSprite.activate(false);
                nodeSprite.addEventListener("showNext", (_event) => {
                    _event.currentTarget.showFrameNext();
                }, true);
                this.appendChild(nodeSprite);
            }
            this.show(ACTION.IDLE);
            ƒ.Loop.addEventListener("loopFrame" /* LOOP_FRAME */, this.update);
        }
        static generateSprites(_txtImage) {
            Hare.sprites = [];
            let sprite = new L_ScrollerFinal.Sprite(ACTION.WALK);
            sprite.generateByGrid(_txtImage, ƒ.Rectangle.GET(2, 104, 68, 64), 6, ƒ.Vector2.ZERO(), 64, ƒ.ORIGIN2D.BOTTOMCENTER);
            Hare.sprites.push(sprite);
            sprite = new L_ScrollerFinal.Sprite(ACTION.IDLE);
            sprite.generateByGrid(_txtImage, ƒ.Rectangle.GET(8, 20, 45, 72), 4, ƒ.Vector2.ZERO(), 64, ƒ.ORIGIN2D.BOTTOMCENTER);
            Hare.sprites.push(sprite);
        }
        show(_action) {
            // if (_action == ACTION.JUMP) return;
            for (let child of this.getChildren())
                child.activate(child.name == _action);
            // this.action = _action;
        }
        act(_action, _direction) {
            switch (_action) {
                case ACTION.IDLE:
                    this.speed.x = 0;
                    break;
                case ACTION.WALK:
                    let direction = _direction == DIRECTION.RIGHT ? 1 : -1;
                    this.speed.x = Hare.speedMax.x; // * direction;
                    this.cmpTransform.local.rotation = ƒ.Vector3.Y(90 - 90 * direction);
                    break;
                case ACTION.JUMP:
                    this.speed.y = 2;
                    break;
            }
            this.show(_action);
        }
        checkCollision() {
            for (let floor of L_ScrollerFinal.level.getChildren()) {
                let rect = floor.getRectWorld();
                //console.log(rect.toString());
                let hit = rect.isInside(this.cmpTransform.local.translation.toVector2());
                if (hit) {
                    let translation = this.cmpTransform.local.translation;
                    translation.y = rect.y;
                    this.cmpTransform.local.translation = translation;
                    this.speed.y = 0;
                }
            }
        }
    }
    Hare.speedMax = new ƒ.Vector2(1.5, 5); // units per second
    Hare.gravity = ƒ.Vector2.Y(-3);
    L_ScrollerFinal.Hare = Hare;
})(L_ScrollerFinal || (L_ScrollerFinal = {}));
//# sourceMappingURL=Hare.js.map