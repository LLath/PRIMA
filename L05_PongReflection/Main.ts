
namespace L05_Reflection {
  // interface KeyPressed {
  //   [code: string]: boolean;
  // }

  import f = FudgeCore;

  export let viewport: f.Viewport;

  // Initializing nodes ---------------------------------------------------------------------------------------------
  let paddleLeft: f.Node = new f.Node("PaddleLeft");
  let paddleRight: f.Node = new f.Node("PaddleRight");
  let nodeBall: f.Node = new f.Node("Ball");
  let nodeRoot: f.Node = new f.Node("Root");

  // Decleration of Vectors -------------------------------------------------------------------------------------------
  let ballVector: f.Vector3 = new f.Vector3(
    (Math.random() * 2 - 1) / 5,
    (Math.random() * 2 - 1) / 5,
    0
  );
  let boundary: f.Vector2;

  let leftPaddlePosition: number = 0;
  let rightPaddlePosition: number = 0;
 
  // Constants --------------------------------------------------------------------------------------------------------
  const CAMERA_POSITION: number = 15;
  const PADDLE_SPEED: number = 0.2;
  const BALL_SIZE: number = 0.2;

  // let keysPressedInterface: KeyPressed = {};
  let keysPressed: Set<string> = new Set();

  window.addEventListener("load", hndLoad);

  function hndLoad(_event: Event): void {
    const canvas: HTMLCanvasElement = document.querySelector("canvas");
    boundary = new f.Vector2(
      canvas.getBoundingClientRect().width,
      canvas.getBoundingClientRect().height
    );
    f.RenderManager.initialize();

    // Create material and nodes --------------------------------------------------------------------------------------
    let material: f.Material = new f.Material(
      "SolidWhite",
      f.ShaderUniColor,
      new f.CoatColored(f.Color.WHITE)
    );

    paddleLeft = createQuadComponent(
      "PaddleLeft",
      material,
      new f.MeshQuad(),
      new f.Vector2(-7, 0),
      new f.Vector2(0.05, 3)
    );
    nodeRoot.appendChild(paddleLeft);

    paddleRight = createQuadComponent(
      "PaddleRight",
      material,
      new f.MeshQuad(),
      new f.Vector2(7, 0),
      new f.Vector2(0.05, 3)
    );
    nodeRoot.appendChild(paddleRight);

    nodeBall = createQuadComponent(
      "Ball",
      material,
      new f.MeshQuad(),
      new f.Vector2(0, 0),
      new f.Vector2(BALL_SIZE, BALL_SIZE)
    );
    nodeRoot.appendChild(nodeBall);

    // Praktikum Collision abfrage
    // Eingrenzen der Fläche mit Objekten
    // Eckpunkte suchen, dann daraus die Kanten bilden

    // Camera controls ------------------------------------------------------------------------------------------------
    let cmpCamera: f.ComponentCamera = new f.ComponentCamera();
    cmpCamera.pivot.translateZ(CAMERA_POSITION);
    viewport = new f.Viewport();

    // EventListeners -------------------------------------------------------------------------------------------------
    document.addEventListener("keydown", hndlKeyDown);
    document.addEventListener("keyup", hndlKeyUp);
    f.Loop.addEventListener(f.EVENT.LOOP_FRAME, update);

    viewport.initialize("Viewport", nodeRoot, cmpCamera, canvas);

    // Debug ----------------------------------------------------------------------------------------------------------
    viewport.showSceneGraph();

    f.Loop.start();
    // viewport.draw();
  }

  // TODO: refactor ballMovement and Collision into 1 Function
  // function detectHit(_pos: f.Vector3, _mtxBox: f.Matrix4x4): boolean {
  //   let translation: f.Vector3 = _mtxBox.translation;
  //   let scaling: f.Vector3 = _mtxBox.scaling;
  //   let scaledLine: number = translation.x * scaling.x;

  //   if (_pos.x < scaledLine)
  //     if (_pos.y < scaledLine)
  //       ballVector.x = -(ballVector.x - 0.02);

  //   return true;
  // }

  function hndlKeyDown(_event: KeyboardEvent): void {
    keysPressed.add(_event.code);
    // keysPressedInterface[_event.code] = true;
  }
  function hndlKeyUp(_event: KeyboardEvent): void {
    keysPressed.delete(_event.code);
    // keysPressedInterface[_event.code] = false;
  }

  /**
   * Ball collision with Walls
   * Changes x to -x / y to -y
   */
  function ballMovement(): void {
    const xBallPosition: number = nodeBall.cmpTransform.local.translation.x;
    const yBallPosition: number = nodeBall.cmpTransform.local.translation.y;
    const xCalcBallBoundary: number = (boundary.x / CAMERA_POSITION) * BALL_SIZE;
    const yCalcBallBoundary: number =
      (boundary.y / CAMERA_POSITION) * BALL_SIZE - BALL_SIZE;

    if (
      xBallPosition > xCalcBallBoundary ||
      xBallPosition < -xCalcBallBoundary
    ) {
      // const player: string = xBallPosition > 0 ? "1" : "2";
      // alert(`Point for Player ${player}`);
      // window.location.reload();
      // ballVector.x = -ballVector.x;
    }

    if (yBallPosition > yCalcBallBoundary || yBallPosition < -yCalcBallBoundary)
      ballVector.y = -ballVector.y;


  }

  /**
   * Controls W,S,ARROW_UP and ARROW_DOWN to move paddles
   */
  function keyBoardControl(): void {
    const cmpPaddleLeft: f.Matrix4x4 = paddleLeft.cmpTransform.local;
    const cmpPaddleRight: f.Matrix4x4 = paddleRight.cmpTransform.local;
    const yPaddleBoundary: number = ((boundary.x / CAMERA_POSITION) * BALL_SIZE) / 2;

    if (
      keysPressed.has(f.KEYBOARD_CODE.W) &&
      leftPaddlePosition < yPaddleBoundary
    ) {
      cmpPaddleLeft.translateY(PADDLE_SPEED);
      leftPaddlePosition += PADDLE_SPEED;
    }

    if (
      keysPressed.has(f.KEYBOARD_CODE.S) &&
      leftPaddlePosition > -yPaddleBoundary
    ) {
      cmpPaddleLeft.translateY(-PADDLE_SPEED);
      leftPaddlePosition -= PADDLE_SPEED;
    }

    if (
      keysPressed.has(f.KEYBOARD_CODE.ARROW_UP) &&
      rightPaddlePosition < yPaddleBoundary
    ) {
      cmpPaddleRight.translateY(PADDLE_SPEED);
      rightPaddlePosition += PADDLE_SPEED;
    }

    if (
      keysPressed.has(f.KEYBOARD_CODE.ARROW_DOWN) &&
      rightPaddlePosition > -yPaddleBoundary
    ) {
      cmpPaddleRight.translateY(-PADDLE_SPEED);
      rightPaddlePosition -= PADDLE_SPEED;
    }
  }

  // TODO: Spielfeld aufbauen 
  // implement Score 
  function collision(): void {
    const yBallPosition: number = nodeBall.cmpTransform.local.translation.y;

    if (
      leftPaddlePosition > yBallPosition - 2 &&
      leftPaddlePosition < yBallPosition + 2 &&
      nodeBall.cmpTransform.local.translation.x < -7
    ) {
      ballVector.x = -(ballVector.x - 0.02);
      if (leftPaddlePosition > yBallPosition - 2 )
      ballVector.y = -ballVector.y; }
    if (
      rightPaddlePosition > yBallPosition - 2 &&
      rightPaddlePosition < yBallPosition + 2 &&
      nodeBall.cmpTransform.local.translation.x > 7
    )
      ballVector.x = -(ballVector.x + 0.02);
  }

  function update(_event: Event): void {
    nodeBall.cmpTransform.local.translate(ballVector);

    // detectHit(nodeBall.cmpTransform.local.translation, paddleLeft.cmpTransform.local);
    // detectHit(nodeBall.cmpTransform.local.translation, paddleRight.cmpTransform.local);
    
    ballMovement();
    keyBoardControl();
    collision();

    // console.log(ballVector.x);

    f.RenderManager.update();
    viewport.draw();
  }

  /**
   *
   * @param _nameNode
   * @param _material
   * @param _mesh
   * @param _pos
   * @param _scale
   */
  function createQuadComponent(
    _nameNode: string,
    _material: f.Material,
    _mesh: f.Mesh,
    _pos: f.Vector2,
    _scale: f.Vector2
  ): f.Node {
    const node: f.Node = new f.Node(_nameNode);
    const cmpMesh: f.ComponentMesh = new f.ComponentMesh(_mesh);
    const cmpMaterial: f.ComponentMaterial = new f.ComponentMaterial(_material);

    // transform _scale and _pos to Vector3 so it can be more easily used for local.translate
    const scale: f.Vector3 = new f.Vector3(_scale.x, _scale.y, 0);
    const pos: f.Vector3 = new f.Vector3(_pos.x, _pos.y, 0);

    cmpMesh.pivot.scale(scale);

    node.addComponent(cmpMesh);
    node.addComponent(cmpMaterial);
    node.addComponent(new f.ComponentTransform());
    node.cmpTransform.local.translate(pos);
    return node;
  }
}
