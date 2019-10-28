namespace L02_FirstFudge {
  import f = FudgeCore;

  window.addEventListener("load", hndLoad);
  export let viewport: f.Viewport;
  let paddleLeft: f.Node = new f.Node("PaddleLeft");
  let paddleRight: f.Node = new f.Node("PaddleRight");
  let keysPressed: Set<string>  = new Set();

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

    let nodeRoot: f.Node = new f.Node("Root");
    paddleLeft = createQuadComponent(
        "PaddeLeft",
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

    nodeRoot.appendChild(
        createQuadComponent(
        "Ball",
        material,
        new f.MeshQuad(),
        new f.Vector2(0, 0),
        new f.Vector2(0.1, 0.1)
        )
    );

    let cmpCamera: f.ComponentCamera = new f.ComponentCamera();
    cmpCamera.pivot.translateZ(15);

    viewport = new f.Viewport();

    document.addEventListener("keydown", hndlKeyDown);
    document.addEventListener("keyup", hndlKeyUp);
    viewport.initialize("Viewport", nodeRoot, cmpCamera, canvas);

    viewport.showSceneGraph();

    f.Loop.addEventListener(f.EVENT.LOOP_FRAME, update);
    // f.Loop.start();

    viewport.draw();
  }

  function hndlKeyDown(_event: KeyboardEvent): void {
    keysPressed.add(_event.code);
    let key: string = _event.code;
    key === f.KEYBOARD_CODE.W ? paddleLeft.cmpTransform.local.translateY(1) : key === f.KEYBOARD_CODE.S && paddleLeft.cmpTransform.local.translateY(-1); 
    key === f.KEYBOARD_CODE.ARROW_UP ? paddleRight.cmpTransform.local.translateY(1) : key === f.KEYBOARD_CODE.ARROW_DOWN && paddleRight.cmpTransform.local.translateY(-1); 
  }
  function hndlKeyUp(_event: KeyboardEvent): void {
    keysPressed.delete(_event.code);
  }
  
  function update(_event: Event): void {
    console.log(keysPressed);
    f.RenderManager.update();
    viewport.draw();
    f.Debug.log("Update");
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
