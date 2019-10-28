"use strict";
var L02_FirstFudge;
(function (L02_FirstFudge) {
    var f = FudgeCore;
    window.addEventListener("load", hndLoad);
    let paddleLeft = new f.Node("PaddleLeft");
    let paddleRight = new f.Node("PaddleRight");
    let keysPressed = new Set();
    /**
     *
     * @param _event
     */
    function hndLoad(_event) {
        const canvas = document.querySelector("canvas");
        f.RenderManager.initialize();
        let material = new f.Material("SolidWhite", f.ShaderUniColor, new f.CoatColored(f.Color.WHITE));
        let nodeRoot = new f.Node("Root");
        paddleLeft = createQuadComponent("PaddeLeft", material, new f.MeshQuad(), new f.Vector2(-7, 0), new f.Vector2(0.05, 3));
        nodeRoot.appendChild(paddleLeft);
        paddleRight = createQuadComponent("PaddleRight", material, new f.MeshQuad(), new f.Vector2(7, 0), new f.Vector2(0.05, 3));
        nodeRoot.appendChild(paddleRight);
        nodeRoot.appendChild(createQuadComponent("Ball", material, new f.MeshQuad(), new f.Vector2(0, 0), new f.Vector2(0.1, 0.1)));
        let cmpCamera = new f.ComponentCamera();
        cmpCamera.pivot.translateZ(15);
        L02_FirstFudge.viewport = new f.Viewport();
        document.addEventListener("keydown", hndlKeyDown);
        document.addEventListener("keyup", hndlKeyUp);
        L02_FirstFudge.viewport.initialize("Viewport", nodeRoot, cmpCamera, canvas);
        L02_FirstFudge.viewport.showSceneGraph();
        f.Loop.addEventListener("loopFrame" /* LOOP_FRAME */, update);
        // f.Loop.start();
        L02_FirstFudge.viewport.draw();
    }
    function hndlKeyDown(_event) {
        keysPressed.add(_event.code);
        let key = _event.code;
        key === f.KEYBOARD_CODE.W ? paddleLeft.cmpTransform.local.translateY(1) : key === f.KEYBOARD_CODE.S && paddleLeft.cmpTransform.local.translateY(-1);
        key === f.KEYBOARD_CODE.ARROW_UP ? paddleRight.cmpTransform.local.translateY(1) : key === f.KEYBOARD_CODE.ARROW_DOWN && paddleRight.cmpTransform.local.translateY(-1);
    }
    function hndlKeyUp(_event) {
        keysPressed.delete(_event.code);
    }
    function update(_event) {
        console.log(keysPressed);
        f.RenderManager.update();
        L02_FirstFudge.viewport.draw();
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
    function createQuadComponent(_nameNode, _material, _mesh, _pos, _scale) {
        const node = new f.Node(_nameNode);
        const cmpMesh = new f.ComponentMesh(_mesh);
        const cmpMaterial = new f.ComponentMaterial(_material);
        // transform _scale and _pos to Vector3 so it can be more easily used for local.translate
        const scale = new f.Vector3(_scale.x, _scale.y, 0);
        const pos = new f.Vector3(_pos.x, _pos.y, 0);
        cmpMesh.pivot.scale(scale);
        node.addComponent(cmpMesh);
        node.addComponent(cmpMaterial);
        node.addComponent(new f.ComponentTransform());
        node.cmpTransform.local.translate(pos);
        return node;
    }
})(L02_FirstFudge || (L02_FirstFudge = {}));
//# sourceMappingURL=Main.js.map