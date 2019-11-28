"use strict";
var L10_FudgeCamera;
(function (L10_FudgeCamera) {
    var f = FudgeCore;
    let viewport;
    let game;
    let rotate;
    let cmpCamera;
    let fragment;
    let grid = new L10_FudgeCamera.Grid();
    // FIXME: New Version of Fudge pls
    window.addEventListener("load", hndLoad);
    function hndLoad(_event) {
        const canvas = document.querySelector("canvas");
        f.RenderManager.initialize(true);
        f.Debug.log("Canvas", canvas);
        let camera = new L10_FudgeCamera.CameraOrbit(75);
        // cmpCamera = new f.ComponentCamera();
        // cmpCamera.pivot.translate(new f.Vector3(5, 15, 20));
        // cmpCamera.pivot.lookAt(f.Vector3.ZERO());
        game = new f.Node("FudgeCraft");
        fragment = new L10_FudgeCamera.Fragment(0);
        game.appendChild(fragment);
        grid.setFragment(fragment);
        fragment = new L10_FudgeCamera.Fragment(1);
        fragment.cmpTransform.local.translateZ(-1);
        fragment.cmpTransform.local.rotateZ(90);
        game.appendChild(fragment);
        grid.setFragment(fragment);
        fragment = new L10_FudgeCamera.Fragment(5);
        fragment.cmpTransform.local.translateX(1);
        fragment.cmpTransform.local.rotateY(180);
        game.appendChild(fragment);
        grid.setFragment(fragment);
        fragment = new L10_FudgeCamera.Fragment(4);
        fragment.cmpTransform.local.translate(new f.Vector3(0, 1, -1));
        fragment.cmpTransform.local.rotate(new f.Vector3(90, 0, 0));
        game.appendChild(fragment);
        rotate = fragment.cmpTransform.local.rotation;
        let cmpLight = new f.ComponentLight(new f.LightDirectional(f.Color.WHITE));
        cmpLight.pivot.lookAt(new f.Vector3(0.5, 1, 0.8));
        game.addComponent(cmpLight);
        viewport = new f.Viewport();
        viewport.initialize("Viewport", game, camera.cmpCamera, canvas);
        f.Debug.log("Viewport", viewport);
        viewport.draw();
        f.Debug.log("Game", game);
        window.addEventListener("keydown", hndKeyDown);
    }
    function hndKeyDown(_event) {
        let tmpRotation = rotate.copy;
        switch (_event.code) {
            case f.KEYBOARD_CODE.ARROW_UP:
                rotate.add(f.Vector3.X(-90));
                break;
            case f.KEYBOARD_CODE.ARROW_DOWN:
                rotate.add(f.Vector3.X(90));
                break;
            case f.KEYBOARD_CODE.ARROW_LEFT:
                rotate.add(f.Vector3.Y(-90));
                break;
            case f.KEYBOARD_CODE.ARROW_RIGHT:
                rotate.add(f.Vector3.Y(90));
                break;
            case f.KEYBOARD_CODE.A:
                cmpCamera.pivot.translation = new f.Vector3(-5, 15, -20);
                cmpCamera.pivot.lookAt(f.Vector3.ZERO());
                break;
            case f.KEYBOARD_CODE.D:
                cmpCamera.pivot.translation = new f.Vector3(5, 15, 20);
                cmpCamera.pivot.lookAt(f.Vector3.ZERO());
                break;
        }
        fragment.cmpTransform.local.rotation = rotate;
        for (let cube of fragment.getChildren()) {
            if (grid.hasCube(cube.toString())) {
                rotate = tmpRotation;
                fragment.cmpTransform.local.rotation = tmpRotation;
                break;
            }
        }
        f.RenderManager.update();
        viewport.draw();
    }
})(L10_FudgeCamera || (L10_FudgeCamera = {}));
//# sourceMappingURL=Main.js.map