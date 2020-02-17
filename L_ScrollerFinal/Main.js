"use strict";
var L_ScrollerFinal;
(function (L_ScrollerFinal) {
    L_ScrollerFinal.ƒ = FudgeCore;
    let GAMESTATE;
    (function (GAMESTATE) {
        GAMESTATE["START"] = "Start";
        GAMESTATE["INGAME"] = "Ingame";
        GAMESTATE["OPTIONS"] = "Options";
        GAMESTATE["RESTART"] = "Restart";
        GAMESTATE["CLOSE"] = "Close";
        GAMESTATE["KEYBINDINGS"] = "Keybindings";
    })(GAMESTATE = L_ScrollerFinal.GAMESTATE || (L_ScrollerFinal.GAMESTATE = {}));
    window.addEventListener("load", gameMenu);
    L_ScrollerFinal.keybinding = {
        left: L_ScrollerFinal.ƒ.KEYBOARD_CODE.A,
        right: L_ScrollerFinal.ƒ.KEYBOARD_CODE.D,
        jump: L_ScrollerFinal.ƒ.KEYBOARD_CODE.SPACE
    };
    let keyPressed;
    function mouseOverButton(_point, _button) {
        return (_point.x < _button.x + _button.w &&
            _point.x > _button.x &&
            _point.y < _button.y + _button.h &&
            _point.y > _button.y);
    }
    function makeKeyCodeReadable(_keyCode) {
        return _keyCode.replace(/[kK]ey/, "");
    }
    let drawKeybinds = 0;
    // TODO: START statt INGAME
    L_ScrollerFinal.state = GAMESTATE.START;
    function gameMenu() {
        let canvas = document.querySelector("canvas");
        let crc2 = canvas.getContext("2d");
        if (localStorage.getItem("Keybindings")) {
            L_ScrollerFinal.keybinding = JSON.parse(localStorage.getItem("Keybindings"));
        }
        let menuButtons = [
            {
                name: GAMESTATE.KEYBINDINGS,
                x: canvas.width / 2 - 50,
                y: canvas.height / 4 - 50,
                w: 100,
                h: 50
            },
            {
                name: GAMESTATE.INGAME,
                x: canvas.width / 2 - 50,
                y: canvas.height / 3,
                w: 100,
                h: 50
            },
            {
                name: GAMESTATE.CLOSE,
                x: canvas.width / 2 - 50,
                y: canvas.height / 2,
                w: 100,
                h: 50
            },
            {
                name: GAMESTATE.RESTART,
                x: canvas.width / 2 - 50,
                y: canvas.height / 2 + 100,
                w: 100,
                h: 50
            }
        ];
        let keybindingButtons = [
            {
                name: "left",
                x: canvas.width / 2 - 250,
                y: canvas.height / 4 - 50,
                w: 100,
                h: 50
            },
            {
                name: "right",
                x: canvas.width / 2 - 250,
                y: canvas.height / 3,
                w: 100,
                h: 50
            },
            {
                name: "jump",
                x: canvas.width / 2 - 250,
                y: canvas.height / 2,
                w: 100,
                h: 50
            }
        ];
        function drawKeybindMenu() {
            crc2.beginPath();
            crc2.fillStyle = "rgba(255,255,255,0.8)";
            crc2.fillRect(0, 0, canvas.width / 2 - 130, canvas.height);
            keybindingButtons.forEach((button, index) => {
                crc2.globalAlpha = 1;
                crc2.fillStyle = "black";
                crc2.textAlign = "center";
                let horizontalMid = button.y + button.h / 2 + 2;
                let verticalMid = button.x + button.w / 2;
                switch (index) {
                    case 0:
                        crc2.fillText(`Move left - ${makeKeyCodeReadable(L_ScrollerFinal.keybinding.left)}`, verticalMid, horizontalMid, 140);
                        crc2.strokeRect(button.x, button.y, button.w, button.h);
                        break;
                    case 1:
                        crc2.fillText(`Move right - ${makeKeyCodeReadable(L_ScrollerFinal.keybinding.right)}`, verticalMid, horizontalMid, 140);
                        crc2.strokeRect(button.x, button.y, button.w, button.h);
                        break;
                    case 2:
                        crc2.fillText(`Jump - ${makeKeyCodeReadable(L_ScrollerFinal.keybinding.jump)}`, verticalMid, horizontalMid, 140);
                        crc2.strokeRect(button.x, button.y, button.w, button.h);
                        break;
                    default:
                        break;
                }
            });
        }
        // Add click event listener for menuButtons
        handleMenu(canvas, menuButtons);
        document.addEventListener("keydown", handleKeyboard);
        document.addEventListener("keyup", handleKeyboard);
        crc2.fillStyle = "rgba(255,255,255,0.8)";
        crc2.fillRect(0, 0, canvas.width, canvas.height);
        menuButtons.forEach(button => {
            crc2.globalAlpha = 1;
            crc2.beginPath();
            crc2.fillStyle = "black";
            crc2.textAlign = "center";
            let horizontalMid = button.y + button.h / 2 + 2;
            let verticalMid = button.x + button.w / 2;
            switch (button.name) {
                case "Keybindings":
                    crc2.fillText(button.name, verticalMid, horizontalMid, 140);
                    crc2.strokeRect(button.x, button.y, button.w, button.h);
                    break;
                case "Ingame":
                    let _nameIngame = "Start";
                    if (L_ScrollerFinal.state === GAMESTATE.OPTIONS) {
                        _nameIngame = "Resume";
                    }
                    crc2.fillText(_nameIngame, verticalMid, horizontalMid, 140);
                    crc2.strokeRect(button.x, button.y, button.w, button.h);
                    break;
                case "Close":
                    let _nameClose = "Close";
                    if (L_ScrollerFinal.state === GAMESTATE.OPTIONS) {
                        _nameClose = "Back";
                    }
                    crc2.fillText(_nameClose, verticalMid, horizontalMid, 140);
                    crc2.strokeRect(button.x, button.y, button.w, button.h);
                    break;
                case "Restart":
                    if (L_ScrollerFinal.state === GAMESTATE.OPTIONS) {
                        crc2.fillText("Restart", verticalMid, horizontalMid, 140);
                        crc2.strokeRect(button.x, button.y, button.w, button.h);
                    }
                    break;
                default:
                    break;
            }
        });
        L_ScrollerFinal.ƒ.Loop.addEventListener("loopFrame" /* LOOP_FRAME */, update);
        L_ScrollerFinal.ƒ.Loop.start(L_ScrollerFinal.ƒ.LOOP_MODE.TIME_GAME, 25);
        function update() {
            processInput();
            switch (L_ScrollerFinal.state) {
                case GAMESTATE.START:
                    console.log("Start");
                    break;
                case GAMESTATE.INGAME:
                    drawKeybinds = 0;
                    crc2.clearRect(0, 0, canvas.width, canvas.height);
                    L_ScrollerFinal.ƒ.Loop.stop();
                    L_ScrollerFinal.ƒ.Loop.removeEventListener("loopFrame" /* LOOP_FRAME */, update);
                    console.log("Ingame");
                    L_ScrollerFinal.gameLoop();
                    break;
                case GAMESTATE.CLOSE:
                    drawKeybinds = 0;
                    crc2.clearRect(0, 0, canvas.width, canvas.height);
                    L_ScrollerFinal.ƒ.Loop.stop();
                    L_ScrollerFinal.ƒ.Loop.removeEventListener("loopFrame" /* LOOP_FRAME */, update);
                    try {
                        L_ScrollerFinal.game.removeChild(L_ScrollerFinal.level);
                    }
                    catch (error) {
                        console.error("No Level to delete");
                    }
                    localStorage.removeItem("SaveState");
                    localStorage.removeItem("Level");
                    L_ScrollerFinal.state = GAMESTATE.START;
                    console.log("Close");
                    gameMenu();
                    break;
                case GAMESTATE.RESTART:
                    crc2.clearRect(0, 0, canvas.width, canvas.height);
                    L_ScrollerFinal.ƒ.Loop.stop();
                    L_ScrollerFinal.ƒ.Loop.removeEventListener("loopFrame" /* LOOP_FRAME */, update);
                    console.log("Restart");
                    L_ScrollerFinal.gameLoop();
                    break;
                case GAMESTATE.OPTIONS:
                    console.log("Options");
                    break;
                case GAMESTATE.KEYBINDINGS:
                    handleMenu(canvas, keybindingButtons);
                    if (drawKeybinds === 0) {
                        crc2.clearRect(0, 0, canvas.width / 2 - 130, canvas.height);
                        drawKeybinds++;
                        drawKeybindMenu();
                    }
                    handleMenu(canvas, menuButtons);
                    console.log("Keybindings");
                    break;
                default:
                    break;
            }
        }
    }
    L_ScrollerFinal.gameMenu = gameMenu;
    function handleKeyboard(_event) {
        keyPressed = _event.code;
    }
    let buttonName;
    let keybindPress = false;
    function handleMenu(_canvas, _buttons) {
        _canvas.addEventListener("click", function handler(_event) {
            const rect = _canvas.getBoundingClientRect();
            const mousePos = {
                x: _event.clientX - rect.left,
                y: _event.clientY - rect.top
            };
            _buttons.forEach(button => {
                if (mouseOverButton(mousePos, button)) {
                    if (Object.values(GAMESTATE).includes(button.name)) {
                        L_ScrollerFinal.state = button.name;
                    }
                    else {
                        keybindPress = true;
                        buttonName = button.name;
                        keyPressed = L_ScrollerFinal.ƒ.KEYBOARD_CODE.F5;
                    }
                    this.removeEventListener("click", handler);
                }
            });
        });
    }
    function processInput() {
        let _bind = buttonName;
        if (keybindPress) {
            if (keyPressed !== undefined && keyPressed !== L_ScrollerFinal.ƒ.KEYBOARD_CODE.F5) {
                L_ScrollerFinal.keybinding[_bind] = keyPressed;
                localStorage.setItem("Keybindings", JSON.stringify(L_ScrollerFinal.keybinding));
            }
            setTimeout(() => {
                drawKeybinds = 0;
                keybindPress = false;
            }, 300);
        }
    }
})(L_ScrollerFinal || (L_ScrollerFinal = {}));
//# sourceMappingURL=Main.js.map