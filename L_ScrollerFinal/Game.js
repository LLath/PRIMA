"use strict";
var L_ScrollerFinal;
(function (L_ScrollerFinal) {
    L_ScrollerFinal.Sprite = L14_ScrollerFoundation.Sprite;
    L_ScrollerFinal.NodeSprite = L14_ScrollerFoundation.NodeSprite;
    let keysPressed = {};
    const midGround = new L_ScrollerFinal.ƒ.Node("Midground");
    L_ScrollerFinal.statUpgrade = { speed: 0, jump: 0 };
    function gameLoop() {
        let canvas = document.querySelector("canvas");
        const camera = new L_ScrollerFinal.Camera();
        let char = document.querySelector("#char");
        let img = document.querySelector("#background");
        let txtHare = new L_ScrollerFinal.ƒ.TextureImage();
        let txtBackground = new L_ScrollerFinal.ƒ.TextureImage();
        let viewport = new L_ScrollerFinal.ƒ.Viewport();
        const foreground = new L_ScrollerFinal.ƒ.Node("Foreground");
        const background = new L_ScrollerFinal.ƒ.Node("Background");
        if (L_ScrollerFinal.savedData) {
            if (L_ScrollerFinal.state === L_ScrollerFinal.GAMESTATE.RESTART) {
                let hareLocal = L_ScrollerFinal.savedData
                    .getChildrenByName("Midground")[0]
                    .getChildrenByName("Hare")[0].cmpTransform.local;
                hareLocal.translate(new L_ScrollerFinal.ƒ.Vector3(-hareLocal.translation.x, -hareLocal.translation.y, hareLocal.translation.z));
            }
            if (L_ScrollerFinal.state === L_ScrollerFinal.GAMESTATE.INGAME &&
                L_ScrollerFinal.game.getChildrenByName("Level").length < 1) {
                L_ScrollerFinal.level = L_ScrollerFinal.createLevel(midGround);
                L_ScrollerFinal.savedData.appendChild(L_ScrollerFinal.level);
            }
            L_ScrollerFinal.game = L_ScrollerFinal.savedData;
            viewport.initialize("SavedViewport", L_ScrollerFinal.savedData, camera, canvas);
            viewport.draw();
        }
        else {
            txtHare.image = char;
            txtBackground.image = img;
            L_ScrollerFinal.Hare.generateSprites(txtHare);
            L_ScrollerFinal.ƒ.RenderManager.initialize(true, false);
            L_ScrollerFinal.game = new L_ScrollerFinal.ƒ.Node("Game");
            L_ScrollerFinal.level = L_ScrollerFinal.createLevel(midGround);
            L_ScrollerFinal.game.appendChild(L_ScrollerFinal.level);
            L_ScrollerFinal.game.appendChild(midGround);
            let backgroundSprite = new L_ScrollerFinal.Sprite("Sprite");
            backgroundSprite.generateByGrid(txtBackground, L_ScrollerFinal.ƒ.Rectangle.GET(0, 0, 900, 600, L_ScrollerFinal.ƒ.ORIGIN2D.TOPLEFT), 1, L_ScrollerFinal.ƒ.Vector2.ZERO(), 24, L_ScrollerFinal.ƒ.ORIGIN2D.CENTER);
            let nodeSprite = new L_ScrollerFinal.NodeSprite("BackgroundImage", backgroundSprite);
            nodeSprite.addComponent(new L_ScrollerFinal.ƒ.ComponentTransform());
            nodeSprite.cmpTransform.local.translate(new L_ScrollerFinal.ƒ.Vector3(camera.levelBeginning.x, camera.levelBeginning.y, -15));
            nodeSprite.cmpTransform.local.scaleX(1.2);
            background.appendChild(nodeSprite);
            foreground.addComponent(new L_ScrollerFinal.ƒ.ComponentTransform());
            let floor;
            let lastforeGroundImageX = 0;
            function createForeGround(_start = lastforeGroundImageX) {
                let randomY = Math.random() * (0 - 0.3) + 0;
                let randomX = Math.random() * (5 - 1) + 1;
                floor = new L_ScrollerFinal.Floor("ForegroundImage", "chocolate");
                let translation = floor.cmpTransform.local;
                translation.scaleY(1.5);
                translation.scaleX(1);
                translation.translateY(randomY);
                translation.translateX(_start + randomX);
                translation.translateZ(2);
                lastforeGroundImageX = translation.translation.x;
                foreground.appendChild(floor);
            }
            createForeGround(0);
            createForeGround();
            createForeGround();
            createForeGround();
            createForeGround();
            createForeGround();
            L_ScrollerFinal.game.appendChild(foreground);
            L_ScrollerFinal.game.appendChild(background);
            viewport.initialize("Viewport", L_ScrollerFinal.game, camera, canvas);
        }
        document.addEventListener("keydown", handleKeyboard);
        document.addEventListener("keyup", handleKeyboard);
        L_ScrollerFinal.ƒ.Loop.addEventListener("loopFrame" /* LOOP_FRAME */, update);
        L_ScrollerFinal.ƒ.Loop.start(L_ScrollerFinal.ƒ.LOOP_MODE.TIME_GAME, 60);
        viewport.showSceneGraph();
        function getGameChildren(_name) {
            return L_ScrollerFinal.game.getChildrenByName(_name)[0];
        }
        let timeForNewBackground = 0;
        function update(_event) {
            // Everything that needs Hare to funtion properly
            if (midGround.getChildrenByName("Hare")[0]) {
                processInput();
                if (L_ScrollerFinal.hare.speed.x > 0) {
                    getGameChildren("Foreground")
                        .getChildrenByName("ForegroundImage")
                        .forEach(child => {
                        child.cmpTransform.local.translateX(-0.01);
                    });
                    getGameChildren("Background")
                        .getChildren()
                        .forEach(child => {
                        child.cmpTransform.local.translateX(-0.01);
                    });
                }
                if (L_ScrollerFinal.hare.cmpTransform.local.translation.y < -1) {
                    L_ScrollerFinal.state = L_ScrollerFinal.GAMESTATE.OPTIONS;
                }
                if (L_ScrollerFinal.hare.cmpTransform.local.translation.x < -0.5) {
                    L_ScrollerFinal.hare.cmpTransform.local.translateX(0.1);
                }
                camera.translateBasedOn(L_ScrollerFinal.hare);
                if (timeForNewBackground === 0) {
                    let sprite = new L_ScrollerFinal.Sprite("Sprite");
                    txtBackground.image = img;
                    sprite.generateByGrid(txtBackground, L_ScrollerFinal.ƒ.Rectangle.GET(0, 0, 900, 600, L_ScrollerFinal.ƒ.ORIGIN2D.TOPLEFT), 1, L_ScrollerFinal.ƒ.Vector2.ZERO(), 24, L_ScrollerFinal.ƒ.ORIGIN2D.CENTER);
                    let nodeSprite = new L_ScrollerFinal.NodeSprite("BackgroundImage", sprite);
                    nodeSprite.addComponent(new L_ScrollerFinal.ƒ.ComponentTransform());
                    nodeSprite.cmpTransform.local.translate(new L_ScrollerFinal.ƒ.Vector3(camera.levelEnd.x, camera.levelBeginning.y, -15));
                    nodeSprite.cmpTransform.local.scaleX(1.2);
                    getGameChildren("Background").appendChild(nodeSprite);
                    timeForNewBackground++;
                }
                getGameChildren("Foreground")
                    .getChildrenByName("ForegroundImage")
                    .forEach(child => {
                    child.cmpTransform.local.translateX(-0.001);
                });
                getGameChildren("Foreground")
                    .getChildren()
                    .map(v => v.cmpTransform.local)
                    .forEach(v => {
                    if (v.translation.x <= 0) {
                        v.translateX(camera.levelEnd.x);
                    }
                });
                viewport.draw();
                switch (L_ScrollerFinal.state) {
                    case L_ScrollerFinal.GAMESTATE.OPTIONS:
                        let children = L_ScrollerFinal.game
                            .getChildrenByName("Level")[0]
                            .getChildren();
                        let childrenHare = L_ScrollerFinal.game
                            .getChildrenByName("Midground")[0]
                            .getChildrenByName("Hare");
                        let childrenTranslation = children.map(v => v.cmpTransform.local.translation);
                        let childTranslationHare = childrenHare.map(v => v.cmpTransform.local.translation);
                        let gameArray = [];
                        childrenTranslation.forEach(child => gameArray.push({ x: child.x, y: child.y, z: 0 }));
                        gameArray.push({
                            harePos: {
                                x: childTranslationHare[0].x,
                                y: childTranslationHare[0].y,
                                z: 0
                            }
                        });
                        gameArray.push({
                            stats: { speed: L_ScrollerFinal.hare.stats.speed, jump: L_ScrollerFinal.hare.stats.jump }
                        });
                        L_ScrollerFinal.savedData = L_ScrollerFinal.game;
                        //  TODO: IF Server change to
                        localStorage.setItem("SaveState", JSON.stringify(gameArray));
                        L_ScrollerFinal.ƒ.Loop.stop();
                        L_ScrollerFinal.ƒ.Loop.removeEventListener("loopFrame" /* LOOP_FRAME */, update);
                        L_ScrollerFinal.gameMenu();
                        console.log("Options");
                        break;
                    case L_ScrollerFinal.GAMESTATE.CLOSE:
                        // TODO: If Time make Endscreen
                        console.log("Endscreen");
                        break;
                    case L_ScrollerFinal.GAMESTATE.RESTART:
                        L_ScrollerFinal.state = L_ScrollerFinal.GAMESTATE.INGAME;
                        break;
                    default:
                        break;
                }
            }
        }
    }
    L_ScrollerFinal.gameLoop = gameLoop;
    function handleKeyboard(_event) {
        keysPressed[_event.code] = _event.type == "keydown";
        if (keysPressed[L_ScrollerFinal.keybinding.jump]) {
            L_ScrollerFinal.hare.act(L_ScrollerFinal.ACTION.JUMP);
        }
    }
    function processInput() {
        switch (L_ScrollerFinal.state) {
            case L_ScrollerFinal.GAMESTATE.INGAME:
                if (keysPressed[L_ScrollerFinal.keybinding.left]) {
                    L_ScrollerFinal.hare.act(L_ScrollerFinal.ACTION.WALK, L_ScrollerFinal.DIRECTION.LEFT);
                    return;
                }
                if (keysPressed[L_ScrollerFinal.keybinding.right]) {
                    L_ScrollerFinal.hare.act(L_ScrollerFinal.ACTION.WALK, L_ScrollerFinal.DIRECTION.RIGHT);
                    return;
                }
                if (keysPressed[L_ScrollerFinal.ƒ.KEYBOARD_CODE.ESC]) {
                    L_ScrollerFinal.state = L_ScrollerFinal.GAMESTATE.OPTIONS;
                }
                L_ScrollerFinal.hare.act(L_ScrollerFinal.ACTION.IDLE);
                break;
            case L_ScrollerFinal.GAMESTATE.START:
                if (keysPressed[L_ScrollerFinal.ƒ.KEYBOARD_CODE.ENTER]) {
                    L_ScrollerFinal.state = L_ScrollerFinal.GAMESTATE.INGAME;
                }
            case L_ScrollerFinal.GAMESTATE.OPTIONS:
                if (keysPressed[L_ScrollerFinal.ƒ.KEYBOARD_CODE.ENTER]) {
                    L_ScrollerFinal.state = L_ScrollerFinal.GAMESTATE.INGAME;
                }
            default:
                break;
        }
    }
})(L_ScrollerFinal || (L_ScrollerFinal = {}));
//# sourceMappingURL=Game.js.map