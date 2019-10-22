namespace L02_FirstFudge {
  import f = FudgeCore;

  window.addEventListener("load", hndLoad);
  export let viewport: f.Viewport;

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
    let paddelLeft: f.Node = createQuadComponent(
      "PaddelLeft",
      material,
      new f.MeshQuad(),
      new f.Vector2(-7, 0),
      new f.Vector2(0.05, 3)
    );
    nodeRoot.appendChild(paddelLeft);

    let paddleRight: f.Node = createQuadComponent(
      "PaddleRight",
      material,
      new f.MeshQuad(),
      new f.Vector2(7, 0),
      new f.Vector2(0.05, 3)
    );

    nodeRoot.appendChild(
      createQuadComponent(
        "Ball",
        material,
        new f.MeshQuad(),
        new f.Vector2(0, 0),
        new f.Vector2(0.1, 0.1)
      )
    );
    nodeRoot.appendChild(paddleRight);

    let cmpCamera: f.ComponentCamera = new f.ComponentCamera();
    cmpCamera.pivot.translateZ(15);

    viewport = new f.Viewport();
    viewport.initialize("Viewport", nodeRoot, cmpCamera, canvas);
    viewport.showSceneGraph();
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
