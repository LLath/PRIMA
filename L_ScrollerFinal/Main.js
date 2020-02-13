"use strict";
var L_ScrollerFinal;
(function (L_ScrollerFinal) {
    L_ScrollerFinal.ƒ = FudgeCore;
    L_ScrollerFinal.Sprite = L14_ScrollerFoundation.Sprite;
    L_ScrollerFinal.NodeSprite = L14_ScrollerFoundation.NodeSprite;
    var getLevel = Levels.generateLevel;
    window.addEventListener("load", test);
    let keysPressed = {};
    let hare;
    let cmpCamera = new L_ScrollerFinal.ƒ.ComponentCamera();
    function test() {
        let canvas = document.querySelector("canvas");
        let crc2 = canvas.getContext("2d");
        let char = document.querySelector("#char");
        let img = document.querySelector("#background");
        let txtHare = new L_ScrollerFinal.ƒ.TextureImage();
        let txtBackground = new L_ScrollerFinal.ƒ.TextureImage();
        txtHare.image = char;
        txtBackground.image = img;
        L_ScrollerFinal.Hare.generateSprites(txtHare);
        L_ScrollerFinal.ƒ.RenderManager.initialize(true, false);
        L_ScrollerFinal.game = new L_ScrollerFinal.ƒ.Node("Game");
        hare = new L_ScrollerFinal.Hare("Hare");
        L_ScrollerFinal.level = createLevel();
        L_ScrollerFinal.game.appendChild(L_ScrollerFinal.level);
        const foreground = new L_ScrollerFinal.ƒ.Node("Foreground");
        const midGround = new L_ScrollerFinal.ƒ.Node("Midground");
        const background = new L_ScrollerFinal.ƒ.Node("Background");
        L_ScrollerFinal.game.appendChild(midGround);
        midGround.appendChild(hare);
        background.addComponent(new L_ScrollerFinal.ƒ.ComponentTransform());
        let sprite = new L_ScrollerFinal.Sprite("Sprite");
        sprite.generateByGrid(txtBackground, L_ScrollerFinal.ƒ.Rectangle.GET(0, 0, 10000, 10000), 1, L_ScrollerFinal.ƒ.Vector2.ZERO(), 27, L_ScrollerFinal.ƒ.ORIGIN2D.CENTER);
        let nodeSprite = new L_ScrollerFinal.NodeSprite("BackgroundImage", sprite);
        background.cmpTransform.local.translate(new L_ScrollerFinal.ƒ.Vector3(0, 0, -15));
        background.appendChild(nodeSprite);
        L_ScrollerFinal.game.appendChild(foreground);
        L_ScrollerFinal.game.appendChild(background);
        cmpCamera.pivot.translateZ(5);
        cmpCamera.pivot.lookAt(L_ScrollerFinal.ƒ.Vector3.ZERO());
        cmpCamera.backgroundColor = L_ScrollerFinal.ƒ.Color.CSS("aliceblue");
        let viewport = new L_ScrollerFinal.ƒ.Viewport();
        viewport.initialize("Viewport", L_ScrollerFinal.game, cmpCamera, canvas);
        viewport.draw();
        document.addEventListener("keydown", handleKeyboard);
        document.addEventListener("keyup", handleKeyboard);
        L_ScrollerFinal.ƒ.Loop.addEventListener("loopFrame" /* LOOP_FRAME */, update);
        L_ScrollerFinal.ƒ.Loop.start(L_ScrollerFinal.ƒ.LOOP_MODE.TIME_GAME, 20);
        viewport.showSceneGraph();
        function update(_event) {
            processInput();
            viewport.draw();
            crc2.strokeRect(-1, -1, canvas.width / 2, canvas.height + 2);
            crc2.strokeRect(-1, canvas.height / 2, canvas.width + 2, canvas.height);
        }
    }
    function handleKeyboard(_event) {
        keysPressed[_event.code] = _event.type == "keydown";
        if (_event.code == L_ScrollerFinal.ƒ.KEYBOARD_CODE.SPACE && _event.type == "keydown")
            hare.act(L_ScrollerFinal.ACTION.JUMP);
    }
    function processInput() {
        if (keysPressed[L_ScrollerFinal.ƒ.KEYBOARD_CODE.A]) {
            hare.act(L_ScrollerFinal.ACTION.WALK, L_ScrollerFinal.DIRECTION.LEFT);
            return;
        }
        if (keysPressed[L_ScrollerFinal.ƒ.KEYBOARD_CODE.D]) {
            hare.act(L_ScrollerFinal.ACTION.WALK, L_ScrollerFinal.DIRECTION.RIGHT);
            return;
        }
        hare.act(L_ScrollerFinal.ACTION.IDLE);
    }
    function createLevel() {
        let level = new L_ScrollerFinal.ƒ.Node("Level");
        let floor = new L_ScrollerFinal.Floor();
        floor.cmpTransform.local.scaleY(0.2);
        level.appendChild(floor);
        getLevel().map(floors => {
            floor = new L_ScrollerFinal.Floor();
            floor.cmpTransform.local.scaleY(Object(floors).scaleY);
            floor.cmpTransform.local.scaleX(Object(floors).scaleX);
            floor.cmpTransform.local.translateY(Object(floors).translateY);
            floor.cmpTransform.local.translateX(Object(floors).translateX);
            level.appendChild(floor);
        });
        return level;
    }
})(L_ScrollerFinal || (L_ScrollerFinal = {}));
//# sourceMappingURL=Main.js.map