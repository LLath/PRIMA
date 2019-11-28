"use strict";
var L10_FudgeCamera;
(function (L10_FudgeCamera) {
    var f = FudgeCore;
    class CameraOrbit extends f.Node {
        constructor(_maxRotx) {
            super("CameraOrbit");
            this.minDistance = 1;
            let cmpTransform = new f.ComponentTransform();
            this.addComponent(cmpTransform);
            this.rotatorX = new f.Node("CameraRotX");
            this.appendChild(this.rotatorX);
            let cmpCamera = new f.ComponentCamera();
            this.setDistance(20);
            cmpCamera.pivot.lookAt(f.Vector3.ZERO());
            cmpCamera.backgroundColor = f.Color.WHITE;
            // this.maxRotX = _maxRotx;
            this.rotatorX.addComponent(cmpCamera);
        }
        get cmpCamera() {
            return this.rotatorX.getComponent(f.ComponentCamera);
        }
        rotateX(_delta) {
            this.rotatorX.cmpTransform.local.rotateX(this.rotatorX.cmpTransform.local.rotation.x + _delta);
        }
        setRotationX(_angle) {
            if (_angle < this.maxRotX)
                this.rotatorX.cmpTransform.local.rotation.x = _angle;
        }
        rotateY(_delta) {
            this.cmpTransform.local.rotation.y =
                this.cmpTransform.local.rotation.y + _delta;
        }
        setRotationY(_angle) {
            this.cmpTransform.local.rotation.y = _angle;
        }
        setDistance(_dist) {
            if (_dist < this.minDistance)
                this.cmpCamera.pivot.translateZ(_dist);
        }
        moveDistance(_delta) {
            this.cmpCamera.pivot.translateZ(this.cmpCamera.pivot.translation.z + _delta);
        }
    }
    L10_FudgeCamera.CameraOrbit = CameraOrbit;
})(L10_FudgeCamera || (L10_FudgeCamera = {}));
//# sourceMappingURL=Camera.js.map