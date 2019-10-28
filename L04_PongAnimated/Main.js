"use strict";
var L04_PongAnimated;
(function (L04_PongAnimated) {
    // interface KeyPressed {
    //   [code: string]: boolean;
    // }
    var f = FudgeCore;
    window.addEventListener("load", hndLoad);
    let paddleLeft = new f.Node("PaddleLeft");
    let paddleRight = new f.Node("PaddleRight");
    let nodeBall = new f.Node("Ball");
    let nodeRoot = new f.Node("Root");
    let ballVector = new f.Vector3((Math.random() * 2 - 1) / 2, (Math.random() * 2 - 1) / 2, 0);
    let boundary;
    const cmrPosition = 15;
    // let keysPressedInterface: KeyPressed = {};
    let keysPressed = new Set();
    let leftPaddleBoundary = 0;
    let rightPaddleBoundary = 0;
    const paddleSpeed = 0.1;
    /**
     *
     * @param _event
     */
    function hndLoad(_event) {
        const canvas = document.querySelector("canvas");
        f.RenderManager.initialize();
        let material = new f.Material("SolidWhite", f.ShaderUniColor, new f.CoatColored(f.Color.WHITE));
        paddleLeft = createQuadComponent("PaddleLeft", material, new f.MeshQuad(), new f.Vector2(-7, 0), new f.Vector2(0.05, 3));
        nodeRoot.appendChild(paddleLeft);
        paddleRight = createQuadComponent("PaddleRight", material, new f.MeshQuad(), new f.Vector2(7, 0), new f.Vector2(0.05, 3));
        nodeRoot.appendChild(paddleRight);
        nodeBall = createQuadComponent("Ball", material, new f.MeshQuad(), new f.Vector2(0, 0), new f.Vector2(0.2, 0.2));
        nodeRoot.appendChild(nodeBall);
        let cmpCamera = new f.ComponentCamera();
        cmpCamera.pivot.translateZ(cmrPosition);
        L04_PongAnimated.viewport = new f.Viewport();
        document.addEventListener("keydown", hndlKeyDown);
        document.addEventListener("keyup", hndlKeyUp);
        L04_PongAnimated.viewport.initialize("Viewport", nodeRoot, cmpCamera, canvas);
        L04_PongAnimated.viewport.showSceneGraph();
        f.Loop.addEventListener("loopFrame" /* LOOP_FRAME */, update);
        boundary = new f.Vector2(canvas.getBoundingClientRect().width, canvas.getBoundingClientRect().height);
        f.Loop.start();
        // viewport.draw();
    }
    function hndlKeyDown(_event) {
        keysPressed.add(_event.code);
        // keysPressedInterface[_event.code] = true;
    }
    function hndlKeyUp(_event) {
        keysPressed.delete(_event.code);
        // keysPressedInterface[_event.code] = false;
    }
    function ballMovement() {
        if (nodeBall.cmpTransform.local.translation.x >
            boundary.x / cmrPosition / 5 ||
            nodeBall.cmpTransform.local.translation.x < -boundary.x / cmrPosition / 5)
            ballVector.x = -ballVector.x;
        if (nodeBall.cmpTransform.local.translation.y >
            boundary.y / cmrPosition / 5 ||
            nodeBall.cmpTransform.local.translation.y < -boundary.y / cmrPosition / 5)
            ballVector.y = -ballVector.y;
    }
    function update(_event) {
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
        if (keysPressed.has(f.KEYBOARD_CODE.ARROW_DOWN) &&
            rightPaddleBoundary > -4) {
            paddleRight.cmpTransform.local.translateY(-paddleSpeed);
            rightPaddleBoundary -= paddleSpeed;
        }
        f.RenderManager.update();
        L04_PongAnimated.viewport.draw();
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
})(L04_PongAnimated || (L04_PongAnimated = {}));
//# sourceMappingURL=Main.js.map