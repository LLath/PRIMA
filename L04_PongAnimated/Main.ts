namespace L04_PongAnimated {
  // interface KeyPressed {
  //   [code: string]: boolean;
  // }

  import f = FudgeCore;

  export let viewport: f.Viewport;

  window.addEventListener("load", hndLoad);
  let paddleLeft: f.Node = new f.Node("PaddleLeft");
  let paddleRight: f.Node = new f.Node("PaddleRight");
  let nodeBall: f.Node = new f.Node("Ball");
  let nodeRoot: f.Node = new f.Node("Root");

  let ballVector: f.Vector3 = new f.Vector3(
    (Math.random() * 2 - 1) / 2,
    (Math.random() * 2 - 1) / 2,
    0
  );

  let boundary: f.Vector2;
  const cmrPosition: number = 15;

  // let keysPressedInterface: KeyPressed = {};
  let keysPressed: Set<string> = new Set();
  let leftPaddleBoundary: number = 0;
  let rightPaddleBoundary: number = 0;
  const paddleSpeed: number = 0.1;

  /**
   *
   * @param _event
   */
  function hndLoad(_event: Event): void {
    const canvas: HTMLCanvasElement = document.querySelector("canvas");
    f.RenderManager.initialize();

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
      new f.Vector2(0.2, 0.2)
    );
    nodeRoot.appendChild(nodeBall);

    let cmpCamera: f.ComponentCamera = new f.ComponentCamera();
    cmpCamera.pivot.translateZ(cmrPosition);

    viewport = new f.Viewport();

    document.addEventListener("keydown", hndlKeyDown);
    document.addEventListener("keyup", hndlKeyUp);
    viewport.initialize("Viewport", nodeRoot, cmpCamera, canvas);

    viewport.showSceneGraph();

    f.Loop.addEventListener(f.EVENT.LOOP_FRAME, update);

    boundary = new f.Vector2(
      canvas.getBoundingClientRect().width,
      canvas.getBoundingClientRect().height
    );

    f.Loop.start();
    // viewport.draw();
  }

  function hndlKeyDown(_event: KeyboardEvent): void {
    keysPressed.add(_event.code);
    // keysPressedInterface[_event.code] = true;
  }
  function hndlKeyUp(_event: KeyboardEvent): void {
    keysPressed.delete(_event.code);
    // keysPressedInterface[_event.code] = false;
  }

  function ballMovement(): void {
    if (
      nodeBall.cmpTransform.local.translation.x >
        boundary.x / cmrPosition / 5 ||
      nodeBall.cmpTransform.local.translation.x < -boundary.x / cmrPosition / 5
    )
      ballVector.x = -ballVector.x;

    if (
      nodeBall.cmpTransform.local.translation.y >
        boundary.y / cmrPosition / 5 ||
      nodeBall.cmpTransform.local.translation.y < -boundary.y / cmrPosition / 5
    )
      ballVector.y = -ballVector.y;
  }

  function update(_event: Event): void {
    nodeBall.cmpTransform.local.translate(ballVector);
    ballMovement();

    if (keysPressed.has(f.KEYBOARD_CODE.W) && leftPaddleBoundary < 4) {
      paddleLeft.cmpTransform.local.translateY(paddleSpeed);
      leftPaddleBoundary += paddleSpeed;
    }

    if (keysPressed.has(f.KEYBOARD_CODE.S) && leftPaddleBoundary > -4) {
      paddleLeft.cmpTransform.local.translateY(-paddleSpeed);
      leftPaddleBoundary -= paddleSpeed;
    }

    if (keysPressed.has(f.KEYBOARD_CODE.ARROW_UP) && rightPaddleBoundary < 4) {
      paddleRight.cmpTransform.local.translateY(paddleSpeed);
      rightPaddleBoundary += paddleSpeed;
    }

    if (
      keysPressed.has(f.KEYBOARD_CODE.ARROW_DOWN) &&
      rightPaddleBoundary > -4
    ) {
      paddleRight.cmpTransform.local.translateY(-paddleSpeed);
      rightPaddleBoundary -= paddleSpeed;
    }

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
