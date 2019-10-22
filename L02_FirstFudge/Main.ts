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

    let node: f.Node = new f.Node("Quad");
    let nodeBackground: f.Node = new f.Node("Background");
    let mesh: f.MeshQuad = new f.MeshQuad();
    let cmpMesh: f.ComponentMesh = new f.ComponentMesh(mesh);
    node.addComponent(cmpMesh);
    nodeBackground.addComponent(new f.ComponentMesh(mesh));
    let mtrSolidWhite: f.Material = new f.Material(
      "SolidWhite",
      f.ShaderUniColor,
      new f.CoatColored(new f.Color(1, 1, 1, 1))
    );
    let cmpMaterial: f.ComponentMaterial = new f.ComponentMaterial(
      mtrSolidWhite
    );
    let mtrSolidGrey: f.Material = new f.Material(
      "SolidGrey",
      f.ShaderUniColor,
      new f.CoatColored(new f.Color(0.5, 0.5, 0.5, 1))
    );

    let cmpMaterialBackground: f.ComponentMaterial = new f.ComponentMaterial(
      mtrSolidGrey
    );
    node.addComponent(cmpMaterial);
    nodeBackground.addComponent(cmpMaterialBackground);

    let cmpCamera: f.ComponentCamera = new f.ComponentCamera();
    cmpCamera.pivot.translateZ(15);

    nodeBackground.appendChild(node);
    viewport = new f.Viewport();
    viewport.initialize("Viewport", nodeBackground, cmpCamera, canvas);
    viewport.pointClientToRender(new f.Vector2(2, 3));
    viewport.showSceneGraph();

    viewport.draw();
  }

  function createQuadComponent(
    _name: string,
    _material: f.ComponentMaterial,
    _color: f.CoatColored
  ) {
    const mesh: f.MeshQuad = new f.MeshQuad();
    const cmpMesh: f.ComponentMesh = new f.ComponentMesh(mesh);
    let mtr: f.Material = new f.Material(_name, f.ShaderUniColor, _color);
    let cmpMaterial: f.ComponentMaterial = new f.ComponentMaterial(mtr);
  }
}
