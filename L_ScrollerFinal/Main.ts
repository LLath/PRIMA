namespace L_ScrollerFinal {
  export import ƒ = FudgeCore;

  export enum GAMESTATE {
    START = "Start",
    INGAME = "Ingame",
    OPTIONS = "Options",
    RESTART = "Restart",
    CLOSE = "Close",
    KEYBINDINGS = "Keybindings"
  }

  window.addEventListener("load", gameMenu);

  export let keybinding: Keybindings = {
    left: ƒ.KEYBOARD_CODE.A,
    right: ƒ.KEYBOARD_CODE.D,
    jump: ƒ.KEYBOARD_CODE.SPACE
  };

  let keyPressed: ƒ.KEYBOARD_CODE;
  export let state: GAMESTATE;

  function mouseOverButton(
    _point: ObjectLiteral,
    _button: ObjectLiteral
  ): boolean {
    return (
      _point.x < _button.x + _button.w &&
      _point.x > _button.x &&
      _point.y < _button.y + _button.h &&
      _point.y > _button.y
    );
  }

  let drawKeybinds: number = 0;

  // TODO: START statt INGAME
  state = GAMESTATE.START;
  export function gameMenu(): void {
    let canvas: HTMLCanvasElement = document.querySelector("canvas");
    let crc2: CanvasRenderingContext2D = canvas.getContext("2d");

    if (localStorage.getItem("Keybindings")) {
      keybinding = JSON.parse(localStorage.getItem("Keybindings"));
    }

    let menuButtons: Array<ObjectLiteral> = [
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

    let keybindingButtons: Array<ObjectLiteral> = [
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

    function makeKeyCodeReadable(_keyCode: ƒ.KEYBOARD_CODE): string {
      return _keyCode.replace(/[kK]ey/, "");
    }

    function drawKeybindMenu(): void {
      crc2.beginPath();
      crc2.fillStyle = "rgba(255,255,255,0.8)";
      crc2.fillRect(0, 0, canvas.width / 2 - 130, canvas.height);
      keybindingButtons.forEach((button, index) => {
        crc2.globalAlpha = 1;
        crc2.fillStyle = "black";
        crc2.textAlign = "center";
        let horizontalMid: number = button.y + button.h / 2 + 2;
        let verticalMid: number = button.x + button.w / 2;

        switch (index) {
          case 0:
            crc2.fillText(
              `Move left - ${makeKeyCodeReadable(keybinding.left)}`,
              verticalMid,
              horizontalMid,
              140
            );
            crc2.strokeRect(button.x, button.y, button.w, button.h);
            break;
          case 1:
            crc2.fillText(
              `Move right - ${makeKeyCodeReadable(keybinding.right)}`,
              verticalMid,
              horizontalMid,
              140
            );
            crc2.strokeRect(button.x, button.y, button.w, button.h);
            break;
          case 2:
            crc2.fillText(
              `Jump - ${makeKeyCodeReadable(keybinding.jump)}`,
              verticalMid,
              horizontalMid,
              140
            );
            crc2.strokeRect(button.x, button.y, button.w, button.h);
            break;
          default:
            break;
        }
      });
    }

    handleMenu(canvas, menuButtons);
    document.addEventListener("keydown", handleKeyboard);
    document.addEventListener("keyup", handleKeyboard);

    crc2.fillStyle = "rgba(255,255,255,0.8)";
    crc2.fillRect(0, 0, canvas.width, canvas.height);

    menuButtons.forEach((button, index) => {
      crc2.globalAlpha = 1;
      crc2.beginPath();
      crc2.fillStyle = "black";

      crc2.textAlign = "center";
      let horizontalMid: number = button.y + button.h / 2 + 2;
      let verticalMid: number = button.x + button.w / 2;
      if (state === GAMESTATE.START) {
        switch (index) {
          case 0:
            crc2.fillText("Keybindings", verticalMid, horizontalMid, 140);
            crc2.strokeRect(button.x, button.y, button.w, button.h);
            break;
          case 1:
            crc2.fillText("Start", verticalMid, horizontalMid, 140);
            crc2.strokeRect(button.x, button.y, button.w, button.h);
            break;
          case 2:
            crc2.fillText("Close", verticalMid, horizontalMid, 140);
            crc2.strokeRect(button.x, button.y, button.w, button.h);
            break;
          default:
            break;
        }
      }
      if (state === GAMESTATE.OPTIONS) {
        switch (index) {
          case 0:
            crc2.fillText("Keybindings", verticalMid, horizontalMid, 140);
            crc2.strokeRect(button.x, button.y, button.w, button.h);
            break;
          case 1:
            crc2.fillText("Resume", verticalMid, horizontalMid, 140);
            crc2.strokeRect(button.x, button.y, button.w, button.h);
            break;
          case 2:
            crc2.fillText("Back", verticalMid, horizontalMid, 140);
            crc2.strokeRect(button.x, button.y, button.w, button.h);
            break;
          case 3:
            crc2.fillText("Restart", verticalMid, horizontalMid, 140);
            crc2.strokeRect(button.x, button.y, button.w, button.h);
            break;
          default:
            break;
        }
      }
    });

    ƒ.Loop.addEventListener(ƒ.EVENT.LOOP_FRAME, update);
    ƒ.Loop.start(ƒ.LOOP_MODE.TIME_GAME, 25);

    function update(): void {
      processInput();
      switch (state) {
        case GAMESTATE.START:
          console.log("Start");
          break;
        case GAMESTATE.INGAME:
          drawKeybinds = 0;
          crc2.clearRect(0, 0, canvas.width, canvas.height);
          ƒ.Loop.stop();
          ƒ.Loop.removeEventListener(ƒ.EVENT.LOOP_FRAME, update);
          console.log("Ingame");
          gameLoop();
          break;
        case GAMESTATE.CLOSE:
          drawKeybinds = 0;
          crc2.clearRect(0, 0, canvas.width, canvas.height);
          ƒ.Loop.stop();
          ƒ.Loop.removeEventListener(ƒ.EVENT.LOOP_FRAME, update);
          game.removeChild(level);
          localStorage.removeItem("SaveState");
          state = GAMESTATE.START;
          console.log("Close");
          gameMenu();
          break;
        case GAMESTATE.RESTART:
          crc2.clearRect(0, 0, canvas.width, canvas.height);
          ƒ.Loop.stop();
          ƒ.Loop.removeEventListener(ƒ.EVENT.LOOP_FRAME, update);
          console.log("Restart");
          gameLoop();
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

  function handleKeyboard(_event: KeyboardEvent): void {
    keyPressed = <ƒ.KEYBOARD_CODE>_event.code;
  }

  let buttonName: string;
  let keybindPress: boolean = false;
  function handleMenu(
    _canvas: HTMLCanvasElement,
    _buttons: Array<ObjectLiteral>
  ): void {
    _canvas.addEventListener("click", function handler(
      _event: MouseEvent
    ): void {
      const rect: ClientRect = _canvas.getBoundingClientRect();
      const mousePos: ObjectLiteral = {
        x: _event.clientX - rect.left,
        y: _event.clientY - rect.top
      };

      _buttons.forEach(button => {
        if (mouseOverButton(mousePos, button)) {
          if (Object.values(GAMESTATE).includes(button.name)) {
            state = button.name;
          } else {
            keybindPress = true;
            buttonName = button.name;
            keyPressed = ƒ.KEYBOARD_CODE.F5;
          }
          this.removeEventListener("click", handler);
        }
      });
    });
  }

  function processInput(): void {
    let _bind: string = buttonName;
    if (keybindPress) {
      if (keyPressed !== undefined && keyPressed !== ƒ.KEYBOARD_CODE.F5) {
        keybinding[_bind] = keyPressed;
        localStorage.setItem("Keybindings", JSON.stringify(keybinding));
      }
      setTimeout(() => {
        drawKeybinds = 0;
        keybindPress = false;
      }, 300);
    }
  }
}
