namespace L_ScrollerFinal {
  import ƒ = FudgeCore;

  export class Floor extends ƒ.Node {
    private static mesh: ƒ.MeshSprite = new ƒ.MeshSprite();
    private static readonly pivot: ƒ.Matrix4x4 = ƒ.Matrix4x4.TRANSLATION(
      ƒ.Vector3.Y(0)
    );

    public constructor(_name: string = "Floor", _color?: string) {
      super(_name);
      this.addComponent(new ƒ.ComponentTransform());
      this.addComponent(
        new ƒ.ComponentMaterial(this.createMaterial(_name, _color))
      );
      let cmpMesh: ƒ.ComponentMesh = new ƒ.ComponentMesh(Floor.mesh);
      cmpMesh.pivot = Floor.pivot;
      this.addComponent(cmpMesh);
    }

    public getRectWorld(): ƒ.Rectangle {
      let rect: ƒ.Rectangle = ƒ.Rectangle.GET(0, 0, 100, 100);
      let topleft: ƒ.Vector3 = new ƒ.Vector3(-0.5, 0.5, 0);
      let bottomright: ƒ.Vector3 = new ƒ.Vector3(0.5, -0.5, 0);

      //let pivot: ƒ.Matrix4x4 = this.getComponent(ƒ.ComponentMesh).pivot;
      let mtxResult: ƒ.Matrix4x4 = ƒ.Matrix4x4.MULTIPLICATION(
        this.mtxWorld,
        Floor.pivot
      );
      topleft.transform(mtxResult, true);
      bottomright.transform(mtxResult, true);

      let size: ƒ.Vector2 = new ƒ.Vector2(
        bottomright.x - topleft.x,
        bottomright.y - topleft.y
      );
      rect.position = topleft.toVector2();
      rect.size = size;

      return rect;
    }
    private createMaterial(_name: string, _color: string = "red"): ƒ.Material {
      let material: ƒ.Material = new ƒ.Material(
        _name,
        ƒ.ShaderUniColor,
        new ƒ.CoatColored(ƒ.Color.CSS(_color, 0.5))
      );
      return material;
    }
  }
}
