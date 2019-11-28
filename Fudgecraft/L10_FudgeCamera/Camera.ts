namespace L10_FudgeCamera {
  import f = FudgeCore;

  export class CameraOrbit extends f.Node {
    private rotatorX: f.Node;
    private maxRotX: number;
    private minDistance: number = 1;

    constructor(_maxRotx: number) {
      super("CameraOrbit");
      let cmpTransform: f.ComponentTransform = new f.ComponentTransform();
      this.addComponent(cmpTransform);

      this.rotatorX = new f.Node("CameraRotX");
      this.appendChild(this.rotatorX);

      let cmpCamera: f.ComponentCamera = new f.ComponentCamera();
      this.setDistance(20);
      cmpCamera.pivot.lookAt(f.Vector3.ZERO());
      cmpCamera.backgroundColor = f.Color.WHITE;
      // this.maxRotX = _maxRotx;
      this.rotatorX.addComponent(cmpCamera);
    }
    get cmpCamera(): f.ComponentCamera {
      return this.rotatorX.getComponent(f.ComponentCamera);
    }
    rotateX(_delta: number): void {
      this.rotatorX.cmpTransform.local.rotateX(
        this.rotatorX.cmpTransform.local.rotation.x + _delta
      );
    }

    // Vector statt rotation.x
    setRotationX(_angle: number): void {
      if (_angle < this.maxRotX)
        this.rotatorX.cmpTransform.local.rotation.x = _angle;
    }

    rotateY(_delta: number): void {
      this.cmpTransform.local.rotation.y =
        this.cmpTransform.local.rotation.y + _delta;
    }

    setRotationY(_angle: number): void {
      this.cmpTransform.local.rotation.y = _angle;
    }

    setDistance(_dist: number): void {
      if (_dist < this.minDistance) this.cmpCamera.pivot.translateZ(_dist);
    }
    moveDistance(_delta: number): void {
      this.cmpCamera.pivot.translateZ(
        this.cmpCamera.pivot.translation.z + _delta
      );
    }
  }
}
