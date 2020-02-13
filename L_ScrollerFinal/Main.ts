namespace L_ScrollerFinal {
  export import ƒ = FudgeCore;
  export import Sprite = L14_ScrollerFoundation.Sprite;
  export import NodeSprite = L14_ScrollerFoundation.NodeSprite;
  import getLevel = Levels.generateLevel;

  window.addEventListener("load", test);

  interface KeyPressed {
    [code: string]: boolean;
  }
  let keysPressed: KeyPressed = {};

  export let game: ƒ.Node;
  export let level: ƒ.Node;
  let hare: Hare;

  let cmpCamera: ƒ.ComponentCamera = new ƒ.ComponentCamera();

  function test(): void {
    let canvas: HTMLCanvasElement = document.querySelector("canvas");
    let crc2: CanvasRenderingContext2D = canvas.getContext("2d");
    let char: HTMLImageElement = document.querySelector("#char");
    let img: HTMLImageElement = document.querySelector("#background");
    let txtHare: ƒ.TextureImage = new ƒ.TextureImage();
    let txtBackground: ƒ.TextureImage = new ƒ.TextureImage();
    txtHare.image = char;
    txtBackground.image = img;
    Hare.generateSprites(txtHare);

    ƒ.RenderManager.initialize(true, false);
    game = new ƒ.Node("Game");
    hare = new Hare("Hare");
    level = createLevel();
    game.appendChild(level);

    const foreground: ƒ.Node = new ƒ.Node("Foreground");
    const midGround: ƒ.Node = new ƒ.Node("Midground");
    const background: ƒ.Node = new ƒ.Node("Background");
    game.appendChild(midGround);
    midGround.appendChild(hare);
    background.addComponent(new ƒ.ComponentTransform());
    let sprite: Sprite = new Sprite("Sprite");
    sprite.generateByGrid(
      txtBackground,
      ƒ.Rectangle.GET(0, 0, 10000, 10000),
      1,
      ƒ.Vector2.ZERO(),
      27,
      ƒ.ORIGIN2D.CENTER
    );
    let nodeSprite: NodeSprite = new NodeSprite("BackgroundImage", sprite);
    background.cmpTransform.local.translate(new ƒ.Vector3(0, 0, -15));
    background.appendChild(nodeSprite);

    game.appendChild(foreground);
    game.appendChild(background);

    cmpCamera.pivot.translateZ(5);
    cmpCamera.pivot.lookAt(ƒ.Vector3.ZERO());
    cmpCamera.backgroundColor = ƒ.Color.CSS("aliceblue");

    let viewport: ƒ.Viewport = new ƒ.Viewport();
    viewport.initialize("Viewport", game, cmpCamera, canvas);
    viewport.draw();

    document.addEventListener("keydown", handleKeyboard);
    document.addEventListener("keyup", handleKeyboard);

    ƒ.Loop.addEventListener(ƒ.EVENT.LOOP_FRAME, update);
    ƒ.Loop.start(ƒ.LOOP_MODE.TIME_GAME, 20);

    viewport.showSceneGraph();

    function update(_event: ƒ.Eventƒ): void {
      processInput();
      viewport.draw();

      crc2.strokeRect(-1, -1, canvas.width / 2, canvas.height + 2);
      crc2.strokeRect(-1, canvas.height / 2, canvas.width + 2, canvas.height);
    }
  }

  function handleKeyboard(_event: KeyboardEvent): void {
    keysPressed[_event.code] = _event.type == "keydown";
    if (_event.code == ƒ.KEYBOARD_CODE.SPACE && _event.type == "keydown")
      hare.act(ACTION.JUMP);
  }

  function processInput(): void {
    if (keysPressed[ƒ.KEYBOARD_CODE.A]) {
      hare.act(ACTION.WALK, DIRECTION.LEFT);
      return;
    }
    if (keysPressed[ƒ.KEYBOARD_CODE.D]) {
      hare.act(ACTION.WALK, DIRECTION.RIGHT);
      return;
    }

    hare.act(ACTION.IDLE);
  }

  function createLevel(): ƒ.Node {
    let level: ƒ.Node = new ƒ.Node("Level");
    let floor: Floor = new Floor();
    floor.cmpTransform.local.scaleY(0.2);
    level.appendChild(floor);

    getLevel().map(floors => {
      floor = new Floor();
      floor.cmpTransform.local.scaleY(Object(floors).scaleY);
      floor.cmpTransform.local.scaleX(Object(floors).scaleX);
      floor.cmpTransform.local.translateY(Object(floors).translateY);
      floor.cmpTransform.local.translateX(Object(floors).translateX);
      level.appendChild(floor);
    });

    return level;
  }
}
