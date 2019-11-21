"use strict";
var L08_FudgeCraft_Movement;
(function (L08_FudgeCraft_Movement) {
    var f = FudgeCore;
    // FIXME: New Version of Fudge pls
    window.addEventListener("load", hndLoad);
    let viewport;
    let game;
    let rotate;
    let cmpCamera;
    let fragment;
    let grid = new L08_FudgeCraft_Movement.Grid();
    function hndLoad(_event) {
        const canvas = document.querySelector("canvas");
        f.RenderManager.initialize(true);
        f.Debug.log("Canvas", canvas);
        cmpCamera = new f.ComponentCamera();
        cmpCamera.pivot.translate(new f.Vector3(5, 15, 20));
        cmpCamera.pivot.lookAt(f.Vector3.ZERO());
        game = new f.Node("FudgeCraft");
        fragment = new L08_FudgeCraft_Movement.Fragment(0);
        game.appendChild(fragment);
        grid.setFragment(fragment);
        fragment = new L08_FudgeCraft_Movement.Fragment(1);
        fragment.cmpTransform.local.translateZ(-1);
        fragment.cmpTransform.local.rotateZ(90);
        game.appendChild(fragment);
        grid.setFragment(fragment);
        fragment = new L08_FudgeCraft_Movement.Fragment(5);
        fragment.cmpTransform.local.translateX(1);
        fragment.cmpTransform.local.rotateY(180);
        game.appendChild(fragment);
        grid.setFragment(fragment);
        fragment = new L08_FudgeCraft_Movement.Fragment(4);
        fragment.cmpTransform.local.translate(new f.Vector3(0, 1, -1));
        fragment.cmpTransform.local.rotate(new f.Vector3(90, 0, 0));
        game.appendChild(fragment);
        rotate = fragment.cmpTransform.local.rotation;
        let cmpLight = new f.ComponentLight(new f.LightDirectional(f.Color.WHITE));
        cmpLight.pivot.lookAt(new f.Vector3(0.5, 1, 0.8));
        game.addComponent(cmpLight);
        viewport = new f.Viewport();
        viewport.initialize("Viewport", game, cmpCamera, canvas);
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
})(L08_FudgeCraft_Movement || (L08_FudgeCraft_Movement = {}));
//# sourceMappingURL=Main.js.map