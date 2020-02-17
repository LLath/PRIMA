namespace L_ScrollerFinal {
  export import Sprite = L14_ScrollerFoundation.Sprite;
  export import NodeSprite = L14_ScrollerFoundation.NodeSprite;

  import getLevel = Level.generateLevel;
  import clearLevel = Level.clear;
  export let game: ƒ.Node;
  export let level: ƒ.Node;

  let keysPressed: KeyPressed = {};

  let hare: Hare;
  export let savedData: ƒ.Node;

  export let statUpgrade: Stats = { speed: 0, jump: 0 };

  export function gameLoop(): void {
    let canvas: HTMLCanvasElement = document.querySelector("canvas");
    const camera: Camera = new Camera();
    let char: HTMLImageElement = document.querySelector("#char");
    let img: HTMLImageElement = document.querySelector("#background");
    let txtHare: ƒ.TextureImage = new ƒ.TextureImage();
    let txtBackground: ƒ.TextureImage = new ƒ.TextureImage();
    let viewport: ƒ.Viewport = new ƒ.Viewport();
    const foreground: ƒ.Node = new ƒ.Node("Foreground");
    const midGround: ƒ.Node = new ƒ.Node("Midground");
    const background: ƒ.Node = new ƒ.Node("Background");

    if (savedData) {
      if (state === GAMESTATE.RESTART) {
        let hareLocal: ƒ.Matrix4x4 = savedData
          .getChildrenByName("Midground")[0]
          .getChildrenByName("Hare")[0].cmpTransform.local;

        hareLocal.translate(
          new ƒ.Vector3(
            -hareLocal.translation.x,
            -hareLocal.translation.y,
            hareLocal.translation.z
          )
        );
      }
      if (
        state === GAMESTATE.INGAME &&
        game.getChildrenByName("Level").length < 1
      ) {
        level = createLevel();
        savedData.appendChild(level);
      }
      game = savedData;
      viewport.initialize("SavedViewport", savedData, camera, canvas);
      viewport.draw();
    } else {
      txtHare.image = char;
      txtBackground.image = img;
      Hare.generateSprites(txtHare);

      ƒ.RenderManager.initialize(true, false);
      game = new ƒ.Node("Game");
      hare = new Hare("Hare");
      level = createLevel();

      game.appendChild(level);
      game.appendChild(midGround);

      midGround.appendChild(hare);

      let sprite: Sprite = new Sprite("Sprite");
      sprite.generateByGrid(
        txtBackground,
        ƒ.Rectangle.GET(0, 0, 900, 600, ƒ.ORIGIN2D.TOPLEFT),
        1,
        ƒ.Vector2.ZERO(),
        24,
        ƒ.ORIGIN2D.CENTER
      );
      let nodeSprite: NodeSprite = new NodeSprite("BackgroundImage", sprite);
      nodeSprite.addComponent(new ƒ.ComponentTransform());
      nodeSprite.cmpTransform.local.translate(
        new ƒ.Vector3(camera.levelBeginning.x, camera.levelBeginning.y, -15)
      );
      nodeSprite.cmpTransform.local.scaleX(1.2);
      background.appendChild(nodeSprite);

      foreground.addComponent(new ƒ.ComponentTransform());
      let floor: Floor;

      let lastforeGroundImageX: number = 0;

      function createForeGround(_start: number = lastforeGroundImageX): void {
        let randomY: number = Math.random() * (0 - 0.3) + 0;
        let randomX: number = Math.random() * (5 - 1) + 1;
        floor = new Floor("ForegroundImage");
        let translation: ƒ.Matrix4x4 = floor.cmpTransform.local;
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

      game.appendChild(foreground);
      game.appendChild(background);

      viewport.initialize("Viewport", game, camera, canvas);
    }

    document.addEventListener("keydown", handleKeyboard);
    document.addEventListener("keyup", handleKeyboard);

    ƒ.Loop.addEventListener(ƒ.EVENT.LOOP_FRAME, update);
    ƒ.Loop.start(ƒ.LOOP_MODE.TIME_GAME, 60);

    viewport.showSceneGraph();

    function getGameChildren(_name: string): ƒ.Node {
      return game.getChildrenByName(_name)[0];
    }
    function update(_event: ƒ.Eventƒ): void {
      processInput();

      if (hare.speed.x > 0) {
        getGameChildren("Foreground")
          .getChildrenByName("ForegroundImage")
          .forEach(child => {
            child.cmpTransform.local.translateX(-0.01);
          });
        getGameChildren("Background")
          .getChildren()[0]
          .cmpTransform.local.translateX(-0.01);
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

      if (
        hare.cmpTransform.local.translation.x < -1 ||
        hare.cmpTransform.local.translation.y < -1
      ) {
        state = GAMESTATE.OPTIONS;
      }

      viewport.draw();
      camera.translateBasedOn(hare);

      switch (state) {
        case GAMESTATE.OPTIONS:
          let children: Array<ƒ.Node> = game
            .getChildrenByName("Level")[0]
            .getChildren();
          let childrenHare: Array<ƒ.Node> = game
            .getChildrenByName("Midground")[0]
            .getChildrenByName("Hare");
          let childrenTranslation: Array<ƒ.Vector3> = children.map(
            v => v.cmpTransform.local.translation
          );
          let childTranslationHare: Array<ƒ.Vector3> = childrenHare.map(
            v => v.cmpTransform.local.translation
          );
          let gameArray: Array<ObjectLiteral> = [];

          childrenTranslation.forEach(child =>
            gameArray.push({ x: child.x, y: child.y, z: 0 })
          );
          gameArray.push({
            x: childTranslationHare[0].x,
            y: childTranslationHare[0].y,
            z: 0
          });
          savedData = game;
          localStorage.setItem("SaveState", JSON.stringify(gameArray));
          ƒ.Loop.stop();
          ƒ.Loop.removeEventListener(ƒ.EVENT.LOOP_FRAME, update);
          gameMenu();
          console.log("Options");
          break;
        case GAMESTATE.CLOSE:
          // TODO: If Time make Endscreen
          console.log("Endscreen");
          break;
        case GAMESTATE.RESTART:
          state = GAMESTATE.INGAME;
          break;

        default:
          break;
      }
    }
  }

  function handleKeyboard(_event: KeyboardEvent): void {
    keysPressed[_event.code] = _event.type == "keydown";
    if (keysPressed[keybinding.jump]) {
      hare.act(ACTION.JUMP);
    }
  }

  function processInput(): void {
    switch (state) {
      case GAMESTATE.INGAME:
        if (keysPressed[keybinding.left]) {
          hare.act(ACTION.WALK, DIRECTION.LEFT);
          return;
        }
        if (keysPressed[keybinding.right]) {
          hare.act(ACTION.WALK, DIRECTION.RIGHT);
          return;
        }
        if (keysPressed[ƒ.KEYBOARD_CODE.ESC]) {
          state = GAMESTATE.OPTIONS;
        }
        hare.act(ACTION.IDLE);
        break;
      case GAMESTATE.START:
        if (keysPressed[ƒ.KEYBOARD_CODE.ENTER]) {
          state = GAMESTATE.INGAME;
        }
      case GAMESTATE.OPTIONS:
        if (keysPressed[ƒ.KEYBOARD_CODE.ENTER]) {
          state = GAMESTATE.INGAME;
        }
      default:
        break;
    }
  }

  function createLevel(): ƒ.Node {
    interface PowerUp {
      name: string;
    }
    interface Platform {
      scaleY: number;
      scaleX: number;
      translateY: number;
      translateX: number;
      powerUP?: PowerUp;
    }

    interface Level extends Array<Platform> {
      [platform: number]: Platform;
    }

    let level: ƒ.Node = new ƒ.Node("Level");
    let floor: Floor = new Floor();
    let floorHeight: number = 0.2;

    const level1: Level = [
      {
        scaleY: floorHeight,
        scaleX: 10,
        translateX: 0,
        translateY: 0
      },
      {
        scaleY: floorHeight,
        scaleX: 5,
        translateX: 12,
        translateY: 0,
        powerUP: {
          name: "speed"
        }
      },
      {
        scaleY: floorHeight,
        scaleX: 2,
        translateX: 3,
        translateY: 1.5
      },
      {
        scaleY: floorHeight,
        scaleX: 2,
        translateX: 1,
        translateY: 3,
        powerUP: {
          name: "jump"
        }
      },
      {
        scaleY: floorHeight,
        scaleX: 2,
        translateX: 1,
        translateY: 6
      }
    ];

    level1.map(platform => {
      floor = new Floor();
      transformFloor(floor, platform);
      level.appendChild(floor);

      if (platform.powerUP) {
        floor = new Floor(platform.powerUP.name);
        floor.cmpTransform.local.scaleY(0.2);
        floor.cmpTransform.local.scaleX(0.2);
        floor.cmpTransform.local.translateY(platform.translateY + 0.6);
        floor.cmpTransform.local.translateX(platform.translateX);
        level.appendChild(floor);
      }
    });

    level.appendChild(floor);

    // getLevel().map(floors => {
    //   floor = new Floor();
    //   floor.cmpTransform.local.scaleY(floorHeight);
    //   floor.cmpTransform.local.scaleX(Object(floors).scaleX);
    //   floor.cmpTransform.local.translateY(Object(floors).translateY);
    //   floor.cmpTransform.local.translateX(Object(floors).translateX);
    //   level.appendChild(floor);
    // });

    clearLevel();

    function transformFloor(_floor: Floor, _platform: Platform): void {
      _floor.cmpTransform.local.scaleY(floorHeight);
      _floor.cmpTransform.local.scaleX(_platform.scaleX);
      _floor.cmpTransform.local.translateY(_platform.translateY);
      _floor.cmpTransform.local.translateX(_platform.translateX);
    }
    return level;
  }
}
