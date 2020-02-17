"use strict";
var L_ScrollerFinal;
(function (L_ScrollerFinal) {
    var ƒ = FudgeCore;
    let ACTION;
    (function (ACTION) {
        ACTION["IDLE"] = "Idle";
        ACTION["WALK"] = "Walk";
        ACTION["JUMP"] = "Jump";
        ACTION["LAND"] = "Land";
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
            this.lastFrameTime = 0;
            this.stats = {
                speed: 3 + L_ScrollerFinal.statUpgrade.speed,
                jump: 4.5 + L_ScrollerFinal.statUpgrade.jump
            };
            this.update = (_event) => {
                let timeFrame = ƒ.Loop.timeFrameGame / 1000;
                this.lastFrameTime += timeFrame;
                while (this.lastFrameTime > 0.2) {
                    this.broadcastEvent(new CustomEvent("showNext"));
                    this.lastFrameTime -= 0.2;
                }
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
            sprite = new L_ScrollerFinal.Sprite(ACTION.JUMP);
            sprite.generateByGrid(_txtImage, ƒ.Rectangle.GET(180, 180, 73, 78), 1, ƒ.Vector2.ZERO(), 64, ƒ.ORIGIN2D.BOTTOMCENTER);
            Hare.sprites.push(sprite);
            sprite = new L_ScrollerFinal.Sprite(ACTION.LAND);
            sprite.generateByGrid(_txtImage, ƒ.Rectangle.GET(250, 180, 50, 78), 2, ƒ.Vector2.ZERO(), 64, ƒ.ORIGIN2D.BOTTOMCENTER);
            Hare.sprites.push(sprite);
        }
        show(_action) {
            for (let child of this.getChildren())
                child.activate(child.name == _action);
        }
        act(_action, _direction) {
            switch (_action) {
                case ACTION.IDLE:
                    this.speed.x = 0;
                    if (this.speed.y === 0) {
                        this.show(_action);
                    }
                    break;
                case ACTION.WALK:
                    let direction = _direction == DIRECTION.RIGHT ? 1 : -1;
                    this.speed.x = this.stats.speed;
                    this.cmpTransform.local.rotation = ƒ.Vector3.Y(90 - 90 * direction);
                    if (this.speed.y === 0) {
                        this.show(_action);
                    }
                    break;
                case ACTION.JUMP:
                    if (this.speed.y === 0) {
                        this.speed.y = this.stats.jump;
                    }
                    this.show(_action);
                    break;
            }
        }
        hit(rect) {
            return L_ScrollerFinal.level
                .getChildren()
                .filter(child => rect.isInside(child.cmpTransform.local.translation.toVector2()));
        }
        checkCollision() {
            let translation = this.cmpTransform.local.translation;
            for (let floor of L_ScrollerFinal.level.getChildren()) {
                let rect = floor.getRectWorld();
                let hit = rect.isInside(this.cmpTransform.local.translation.toVector2());
                let rectPlayer = new ƒ.Rectangle(translation.x, translation.y, 1, 1);
                if (hit) {
                    if (floor.name !== "Floor") {
                        if (rectPlayer.collides(rect)) {
                            this.stats[floor.name] += 1;
                            console.log("HI", translation);
                            // let powerUpNode: ƒ.Node = game
                            //   .getChildrenByName("Level")[0]
                            //   .getChildrenByName(floor.name)[0];
                            // game.getChildrenByName("Level")[0].removeChild(powerUpNode);
                        }
                    }
                    if (translation.y > rect.top) {
                        translation.y = rect.y;
                        this.speed.y = 0;
                    }
                    this.cmpTransform.local.translation = translation;
                }
            }
        }
    }
    Hare.gravity = ƒ.Vector2.Y(-6);
    L_ScrollerFinal.Hare = Hare;
})(L_ScrollerFinal || (L_ScrollerFinal = {}));
//# sourceMappingURL=Hare.js.map